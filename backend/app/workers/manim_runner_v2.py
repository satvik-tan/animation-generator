from openai import OpenAI
import os
from dotenv import load_dotenv
from pathlib import Path
import uuid
from markdown_it import MarkdownIt
import subprocess
import re
from typing import Tuple
import time
import boto3

load_dotenv()

# -- LLM Clients --
groq_client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1",
)

GROQ_MODEL = "llama-3.3-70b-versatile"

# -- Directories --
OUTPUT_DIR = Path("output")
ANIMATION_DIR = OUTPUT_DIR / "animations"
OUTPUT_DIR.mkdir(exist_ok=True)
ANIMATION_DIR.mkdir(exist_ok=True)

MANIM_TIMEOUT = 120


def preprocess_code(content: str) -> str:
    md = MarkdownIt()
    tokens = md.parse(content)
    python_blocks = [
        t.content
        for t in tokens
        if t.type == "fence" and t.info.strip().lower() in ("python", "py", "")
    ]
    return python_blocks[0] if python_blocks else ""


def sanitize_code(code: str) -> str:
    lines = code.split("\n")
    sanitized: list[str] = []
    skip_block = False
    indent_level = 0

    for i, line in enumerate(lines):
        if "self.camera.frame" in line or "camera.frame" in line:
            skip_block = True
            indent_level = len(line) - len(line.lstrip())
            print(f"Warning: Removing camera.frame at line {i+1}")
            continue
        if skip_block:
            current_indent = len(line) - len(line.lstrip())
            if line.strip() and current_indent > indent_level:
                continue
            skip_block = False
        sanitized.append(line)

    result = "\n".join(sanitized)
    result = re.sub(r"class\s+(\w+)\s*\(\s*MovingCameraScene\s*\)", r"class \1(Scene)", result)
    result = re.sub(r"class\s+(\w+)\s*\(\s*ThreeDScene\s*\)", r"class \1(Scene)", result)

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


def run_manim(file_path: Path, quality: str = "-ql") -> Tuple[bool, str, Path]:
    quality_map = {"-ql": "480p15", "-qm": "720p30", "-qh": "1080p60"}
    quality_dir = quality_map.get(quality, "480p15")

    try:
        result = subprocess.run(
            ["manim", quality, "--format=mp4", str(file_path), "MainScene"],
            capture_output=True,
            text=True,
            timeout=MANIM_TIMEOUT,
        )
        video_path = Path("media") / "videos" / file_path.stem / quality_dir / "MainScene.mp4"

        if result.returncode != 0:
            return False, f"Manim exit code {result.returncode}:\n{result.stderr}", Path("")

        for attempt in range(10):
            if video_path.exists():
                logs = f"STDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
                return True, logs, video_path
            time.sleep(1)

        return False, f"Video not found at {video_path} after 10s.\n{result.stderr}", Path("")
    except subprocess.TimeoutExpired:
        return False, f"Manim timed out after {MANIM_TIMEOUT}s", Path("")
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

SYSTEM_PROMPT_GENERATE = """You are an expert in creating animated videos using the Manim Community v0.19.0 library.

ABSOLUTE RULES (violation = broken code):
1. Create EXACTLY ONE scene class named `MainScene(Scene)`.
2. ALL animation logic goes inside `def construct(self):`.
3. `from manim import *` is the ONLY import you may use.
4. NEVER use `self.camera`, `self.camera.frame`, `MovingCameraScene`, or `ThreeDScene`.
5. NEVER import external files, SVGs, images, or non-standard libraries.
6. NEVER adjust config (e.g., `config.pixel_width`).
7. Use hex colours (e.g. "#58C4DD"), `run_time=` for durations.
8. Do NOT use `points=` in Polygon / Polygram constructors.

Output ONLY a single fenced Python code block."""

SYSTEM_PROMPT_ITERATE = """You are an expert in creating animated videos using the Manim Community v0.19.0 library.

The user has an existing animation and wants to modify it. You will receive the PREVIOUS working code and the user's modification request.

ABSOLUTE RULES (violation = broken code):
1. Create EXACTLY ONE scene class named `MainScene(Scene)`.
2. ALL animation logic goes inside `def construct(self):`.
3. `from manim import *` is the ONLY import you may use.
4. NEVER use `self.camera`, `self.camera.frame`, `MovingCameraScene`, or `ThreeDScene`.
5. NEVER import external files, SVGs, images, or non-standard libraries.
6. NEVER adjust config.
7. Use hex colours, `run_time=` for durations.
8. Do NOT use `points=` in Polygon / Polygram constructors.

Preserve the working parts of the previous code. Only modify what the user asks for.
Output ONLY a single fenced Python code block."""


def generate_code(prompt: str, previous_code: str | None = None) -> str:
    if previous_code:
        system = SYSTEM_PROMPT_ITERATE
        user_msg = f"Previous working code:\n```python\n{previous_code}\n```\n\nUser's modification request: {prompt}"
    else:
        system = SYSTEM_PROMPT_GENERATE
        user_msg = f"Generate Manim code for: {prompt}"

    resp = groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_msg},
        ],
    )
    if not resp or not resp.choices or not resp.choices[0].message.content:
        raise Exception("Empty response from Groq during code generation")
    return resp.choices[0].message.content


def review_code(code: str, error_logs: str, previous_reviews: str = "") -> str:
    system = f"""You are an expert Manim Community v0.19.0 code reviewer.

<code>
{code}
</code>

<errors>
{error_logs}
</errors>

<previous_reviews>
{previous_reviews}
</previous_reviews>

Identify the ROOT CAUSE of the errors. Do NOT repeat previous advice.
Do NOT suggest self.camera, MovingCameraScene, ThreeDScene, or external resources.
Respond with a concise list of specific fixes. Do NOT include corrected code."""

    resp = groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": "Review the code and describe fixes."},
        ],
    )
    if not resp or not resp.choices or not resp.choices[0].message.content:
        raise Exception("Empty response from Groq during review")
    return resp.choices[0].message.content


def improve_code(code: str, review_feedback: str) -> str:
    system = """You are an expert Manim Community v0.19.0 developer.
Apply the review feedback and output ONLY the corrected Python code in a fenced code block.

RULES:
- EXACTLY ONE class `MainScene(Scene)`
- `from manim import *` only
- NO self.camera, NO MovingCameraScene, NO ThreeDScene
- NO external resources, NO config changes"""

    resp = groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": system},
            {
                "role": "user",
                "content": f"Current code:\n```python\n{code}\n```\n\nReview feedback:\n{review_feedback}\n\nGenerate fixed code:",
            },
        ],
    )
    if not resp or not resp.choices or not resp.choices[0].message.content:
        raise Exception("Empty response from Groq during improvement")
    return resp.choices[0].message.content


def generate_manim_animation(
    prompt: str,
    user_id: str | None = None,
    max_iterations: int = 3,
    previous_code: str | None = None,
) -> tuple[str, str, str]:
    """
    Returns: (s3_key, presigned_url, generated_code)
    """
    file_path: Path | None = None
    previous_reviews = ""
    last_logs = ""

    try:
        print(f"Generating code for: {prompt}")
        raw = generate_code(prompt, previous_code=previous_code)
        code = preprocess_code(raw) or raw

        for iteration in range(max_iterations):
            print(f"\n=== Iteration {iteration + 1}/{max_iterations} ===")

            file_path = push_manim_code(code)
            success, logs, video_path = run_manim(file_path, quality="-ql")
            last_logs = logs

            if success:
                print("Re-rendering at 720p30 for delivery...")
                success_hq, _, video_path_hq = run_manim(file_path, quality="-qm")
                if success_hq:
                    video_path = video_path_hq

                bucket = os.getenv("AWS_S3_BUCKET")
                if not bucket:
                    raise Exception("AWS_S3_BUCKET not set")

                ts = int(time.time())
                uid = user_id or "anonymous"
                s3_key = f"videos/{uid}/{uid}_video_{ts}.mp4"
                presigned_url = upload_to_s3(video_path, bucket, s3_key)
                print(f"Uploaded to S3: {s3_key}")

                # Read back the sanitized code that was actually rendered
                rendered_code = file_path.read_text() if file_path.exists() else code

                if file_path and file_path.exists():
                    file_path.unlink()
                return s3_key, presigned_url, rendered_code

            print(f"Render failed (iter {iteration + 1}), reviewing...")
            review = review_code(code, logs, previous_reviews)
            previous_reviews += f"\n--- Iteration {iteration + 1} ---\n{review}"

            if iteration < max_iterations - 1:
                print("Improving code...")
                raw_improved = improve_code(code, review)
                improved = preprocess_code(raw_improved)
                code = improved or raw_improved

                if file_path and file_path.exists():
                    file_path.unlink()
                    file_path = None

        raise Exception(f"Failed after {max_iterations} iterations. Last error:\n{last_logs}")

    except Exception as e:
        print(f"generate_manim_animation error: {e}")
        if file_path and file_path.exists():
            file_path.unlink()
        raise Exception(f"Animation generation failed: {e}")
