from openai import OpenAI
import os
import logging
from dotenv import load_dotenv
from pathlib import Path
import uuid
from markdown_it import MarkdownIt
import subprocess
import re
from typing import Tuple
import threading
import time
import boto3

load_dotenv()

logger = logging.getLogger(__name__)

# -- LLM Clients --
gemini_client = OpenAI(
    api_key=os.getenv("GEMINI_API_KEY"),
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
)

groq_client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1",
)

GEMINI_MODEL = "gemini-3-flash-preview"
GROQ_MODEL = "llama-3.3-70b-versatile"

# -- Directories --
OUTPUT_DIR = Path("output")
ANIMATION_DIR = OUTPUT_DIR / "animations"
OUTPUT_DIR.mkdir(exist_ok=True)
ANIMATION_DIR.mkdir(exist_ok=True)

MANIM_TIMEOUT = 120


def preprocess_code(content: str) -> str:
    # Strip Qwen3 / reasoning-model <think>…</think> blocks before parsing
    content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()

    md = MarkdownIt()
    tokens = md.parse(content)
    python_blocks = [
        t.content
        for t in tokens
        if t.type == "fence" and t.info.strip().lower() in ("python", "py", "")
    ]
    return python_blocks[0] if python_blocks else ""


def sanitize_code(code: str) -> str:
    result = code

    scene_classes = re.findall(r"class\s+(\w+)\s*\(\s*Scene\s*\)", result)
    if scene_classes and scene_classes[0] != "MainScene":
        result = re.sub(
            rf"class\s+{re.escape(scene_classes[0])}\s*\(\s*Scene\s*\)",
            "class MainScene(Scene)",
            result,
            count=1,
        )
    if len(scene_classes) > 1:
        for extra in scene_classes[1:]:
            result = re.sub(
                rf"\nclass\s+{re.escape(extra)}\s*\(\s*Scene\s*\):.*?(?=\nclass\s|\Z)",
                "",
                result,
                flags=re.DOTALL,
            )
    return result


def push_manim_code(code: str) -> Path:
    code = sanitize_code(code)
    filename = f"animation_{uuid.uuid4()}.py"
    file_path = ANIMATION_DIR / filename
    file_path.write_text(code)
    return file_path


def run_manim(file_path: Path, quality: str = "-ql", cancel_event: threading.Event | None = None) -> Tuple[bool, str, Path]:
    quality_map = {"-ql": "480p15", "-qm": "720p30", "-qh": "1080p60"}
    quality_dir = quality_map.get(quality, "480p15")

    try:
        # Start the manim process
        process = subprocess.Popen(
            ["manim", quality, "--format=mp4", str(file_path), "MainScene"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        
        # Poll for completion or cancellation
        start_time = time.time()
        while True:
            # Check if process finished
            retcode = process.poll()
            if retcode is not None:
                stdout, stderr = process.communicate()
                break
            
            # Check for cancellation
            if cancel_event and cancel_event.is_set():
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
                raise Exception("Job was cancelled during Manim render")
            
            # Check for timeout
            if time.time() - start_time > MANIM_TIMEOUT:
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
                return False, f"Manim timed out after {MANIM_TIMEOUT}s", Path("")
            
            time.sleep(0.5)  # Check every 0.5 seconds
        
        video_path = Path("media") / "videos" / file_path.stem / quality_dir / "MainScene.mp4"

        if retcode != 0:
            return False, f"Manim exit code {retcode}:\n{stderr}", Path("")

        for attempt in range(10):
            if video_path.exists():
                logs = f"STDOUT:\n{stdout}\nSTDERR:\n{stderr}"
                return True, logs, video_path
            time.sleep(1)

        return False, f"Video not found at {video_path} after 10s.\n{stderr}", Path("")
    except Exception as ex:
        return False, f"Unexpected error: {ex}", Path("")


def upload_to_s3(file_path: Path, bucket_name: str, object_name: str) -> str:
    s3 = boto3.client(
        "s3",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=os.getenv("AWS_REGION"),
    )
    s3.upload_file(str(file_path), bucket_name, object_name)
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket_name, "Key": object_name},
        ExpiresIn=3600,
    )


# -- LLM Prompts --

_COMMON_RULES = """
HARD RULES — any violation causes a render crash:
1. `from manim import *` is the ONLY import allowed.
2. Exactly ONE class named `MainScene(Scene)` — no other Scene subclasses.
3. ALL logic inside `def construct(self):` — no helper methods outside the class.
4. NEVER use: `ShowCreation` (use `Create`), `GrowFromCenter` without args, or `ApplyMethod`.
5. NEVER use `MathTex` or `Tex` — use `Text` for all labels and equations.
6. Polygon / Polygram: pass vertices as positional args — NEVER use `points=` keyword.
7. `VGroup.arrange(DOWN, buff=0.5)` — always pass direction as positional arg, not keyword.
9. Every `self.play(...)` call MUST include `run_time=<seconds>`.
10. After the last animation always call `self.wait(1)`.
11. Use hex colour strings like `"#58C4DD"` — never bare colour names as strings.
12. No external files, images, SVGs, audio, or network calls.
"""

SYSTEM_PROMPT_GENERATE = """You are an expert Manim Community v0.19.0 animator. \
Your sole job is to output a single, self-contained Python script that renders correctly with:
  manim -ql --format=mp4 <file> MainScene

""" + _COMMON_RULES + """
STRUCTURE — copy this exactly, fill in `construct`:

```python
from manim import *

class MainScene(Scene):
    def construct(self):
        # ── your animation here ──
        pass
```

Think step-by-step about the animation BEFORE writing code, but output ONLY the final fenced \
Python code block — nothing else."""

SYSTEM_PROMPT_ITERATE = """You are an expert Manim Community v0.19.0 animator. \
The user wants to modify an existing animation. You will receive the PREVIOUS working code \
and their change request.

""" + _COMMON_RULES + """
- Preserve every part of the previous code that the user did NOT ask to change.
- Apply ONLY the requested modifications.
- Output the COMPLETE updated script (not a diff) in a single fenced Python code block — nothing else."""


def get_llm_client(model_provider: str = "gemini", custom_api_key: str | None = None):
    """Get the appropriate LLM client based on provider and custom key"""
    if model_provider == "groq":
        return groq_client, GROQ_MODEL
    else:  # gemini
        if custom_api_key:
            # Create a custom client with user's API key
            custom_client = OpenAI(
                api_key=custom_api_key,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            )
            return custom_client, GEMINI_MODEL
        return gemini_client, GEMINI_MODEL


def generate_code(
    prompt: str, 
    previous_code: str | None = None,
    model_provider: str = "gemini",
    custom_api_key: str | None = None,
) -> str:
    if previous_code:
        system = SYSTEM_PROMPT_ITERATE
        user_msg = f"Previous working code:\n```python\n{previous_code}\n```\n\nUser's modification request: {prompt}"
    else:
        system = SYSTEM_PROMPT_GENERATE
        user_msg = f"Generate Manim code for: {prompt}"

    client, model = get_llm_client(model_provider, custom_api_key)

    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_msg},
        ],
    )
    if not resp or not resp.choices or not resp.choices[0].message.content:
        raise Exception(f"Empty response from {model_provider} during code generation")
    return resp.choices[0].message.content


def review_code(
    code: str, 
    error_logs: str, 
    previous_reviews: str = "",
    model_provider: str = "gemini",
    custom_api_key: str | None = None,
) -> str:
    system = """You are an expert Manim Community v0.19.0 debugger.
You will receive broken code and its error output. Identify the ROOT CAUSE and list \
the EXACT changes needed (line numbers + what to change). Be specific — mention the \
exact symbol, argument, or syntax that is wrong and what it should be replaced with.
Do NOT repeat fixes already listed in previous reviews.
Do NOT output corrected code — only a numbered list of fixes."""

    user_msg = f"""Code:
```python
{code}
```

Error output:
```
{error_logs}
```
""" + (f"\nPrevious reviews (do not repeat these):\n{previous_reviews}" if previous_reviews else "")

    client, model = get_llm_client(model_provider, custom_api_key)

    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_msg},
        ],
    )
    if not resp or not resp.choices or not resp.choices[0].message.content:
        raise Exception(f"Empty response from {model_provider} during review")
    return resp.choices[0].message.content


def improve_code(
    code: str, 
    review_feedback: str,
    model_provider: str = "gemini",
    custom_api_key: str | None = None,
) -> str:
    system = """You are an expert Manim Community v0.19.0 developer.
Apply ALL fixes from the review feedback and output the COMPLETE corrected script.

HARD RULES:
1. `from manim import *` only — no other imports.
2. Exactly one class `MainScene(Scene)` with all logic in `construct(self)`.
3. No `ShowCreation` — use `Create`. No `points=` in Polygon.
4. NEVER use `MathTex` or `Tex` — use `Text` for all labels and equations.
5. Every `self.play(...)` must have `run_time=`. End with `self.wait(1)`.

Output ONLY a single fenced Python code block — nothing else."""

    client, model = get_llm_client(model_provider, custom_api_key)

    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {
                "role": "user",
                "content": f"Code to fix:\n```python\n{code}\n```\n\nRequired fixes:\n{review_feedback}\n\nOutput the corrected script:",
            },
        ],
    )
    if not resp or not resp.choices or not resp.choices[0].message.content:
        raise Exception(f"Empty response from {model_provider} during improvement")
    return resp.choices[0].message.content


def generate_manim_animation(
    prompt: str,
    user_id: str | None = None,
    max_iterations: int = 3,
    previous_code: str | None = None,
    cancel_event: threading.Event | None = None,
    custom_api_key: str | None = None,
    model_provider: str = "gemini",
) -> tuple[str, str, str]:
    """
    Returns: (s3_key, presigned_url, generated_code)
    Raises JobCancelledError if cancel_event is set between iterations.
    """
    from app.workers.worker import JobCancelledError

    file_path: Path | None = None
    previous_reviews = ""
    last_logs = ""

    def _check_cancelled():
        if cancel_event and cancel_event.is_set():
            raise JobCancelledError("Job was cancelled")

    try:
        _check_cancelled()
        logger.info(f"🤖 LLM code generation START | prompt='{prompt[:80]}...' | model={model_provider}")
        llm_start = time.time()
        raw = generate_code(prompt, previous_code=previous_code, model_provider=model_provider, custom_api_key=custom_api_key)
        code = preprocess_code(raw) or raw
        logger.info(f"🤖 LLM code generation DONE | {time.time() - llm_start:.1f}s | code_len={len(code)}")

        for iteration in range(max_iterations):
            _check_cancelled()
            logger.info(f"🔁 === Render attempt {iteration + 1}/{max_iterations} ===")

            file_path = push_manim_code(code)
            render_start = time.time()
            success, logs, video_path = run_manim(file_path, quality="-ql", cancel_event=cancel_event)
            render_elapsed = time.time() - render_start
            last_logs = logs

            if success:
                _check_cancelled()
                logger.info(f"✅ Low-quality render SUCCESS in {render_elapsed:.1f}s — re-rendering at 720p30...")
                hq_start = time.time()
                success_hq, _, video_path_hq = run_manim(file_path, quality="-qm", cancel_event=cancel_event)
                if success_hq:
                    video_path = video_path_hq
                    logger.info(f"✅ HQ render SUCCESS in {time.time() - hq_start:.1f}s")
                else:
                    logger.warning(f"⚠️ HQ render failed, using LQ version")

                bucket = os.getenv("AWS_S3_BUCKET")
                if not bucket:
                    raise Exception("AWS_S3_BUCKET not set")

                ts = int(time.time())
                uid = user_id or "anonymous"
                s3_key = f"videos/{uid}/{uid}_video_{ts}.mp4"
                upload_start = time.time()
                presigned_url = upload_to_s3(video_path, bucket, s3_key)
                logger.info(f"☁️ S3 upload DONE in {time.time() - upload_start:.1f}s | key={s3_key}")

                # Read back the sanitized code that was actually rendered
                rendered_code = file_path.read_text() if file_path.exists() else code

                if file_path and file_path.exists():
                    file_path.unlink()
                return s3_key, presigned_url, rendered_code

            logger.warning(f"❌ Render FAILED (attempt {iteration + 1}) in {render_elapsed:.1f}s — sending to LLM for review...")
            review = review_code(code, logs, previous_reviews, model_provider=model_provider, custom_api_key=custom_api_key)
            previous_reviews += f"\n--- Iteration {iteration + 1} ---\n{review}"

            if iteration < max_iterations - 1:
                _check_cancelled()
                logger.info("🔧 LLM improving code...")
                raw_improved = improve_code(code, review, model_provider=model_provider, custom_api_key=custom_api_key)
                improved = preprocess_code(raw_improved)

                # Better handling: ensure we have valid Python code
                if improved and improved.strip():
                    code = improved
                    logger.info(f"✅ Using improved code ({len(improved)} chars)")
                elif raw_improved and raw_improved.strip():
                    code = raw_improved
                    logger.warning(f"⚠️ Using raw improved code ({len(raw_improved)} chars)")
                else:
                    logger.error("❌ AI returned empty response, keeping current code")
                    # Keep existing code, will likely fail again but prevents crash

                if file_path and file_path.exists():
                    file_path.unlink()
                    file_path = None

        raise Exception(f"Failed after {max_iterations} iterations. Last error:\n{last_logs}")

    except JobCancelledError:
        if file_path and file_path.exists():
            file_path.unlink()
        raise
    except Exception as e:
        logger.error(f"💥 generate_manim_animation error: {e}")
        if file_path and file_path.exists():
            file_path.unlink()
        raise Exception(f"Animation generation failed: {e}")
