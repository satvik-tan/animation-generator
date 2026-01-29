from openai import OpenAI
import os
from dotenv import load_dotenv
from pathlib import Path
import uuid
from markdown_it import MarkdownIt
import subprocess 
from typing import Tuple
import time
import boto3

load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1"
)

# Create necessary directories
OUTPUT_DIR = Path("output")
ANIMATION_DIR = OUTPUT_DIR / "animations"

# Create directories if they don't exist
OUTPUT_DIR.mkdir(exist_ok=True)
ANIMATION_DIR.mkdir(exist_ok=True)


def preprocess_code(content: str) -> str:
    """
    Extract Python code blocks from markdown content using markdown-it-py
    
    Args:
        content: Markdown formatted string containing code blocks
        
    Returns:
        Extracted Python code or empty string if no code blocks found
    """
    md = MarkdownIt()
    tokens = md.parse(content)
    
    # Get all Python code blocks
    python_code_blocks = [
        t.content for t in tokens 
        if t.type == 'fence' and t.info.strip() == 'python'
    ]
    
    # Return first code block or empty string
    return python_code_blocks[0] if python_code_blocks else ""


def sanitize_code(code: str) -> str:
    """
    Remove common errors from generated Manim code.
    
    Args:
        code: The generated Manim code
        
    Returns:
        Sanitized code with common errors removed
    """
    import re
    
    # Remove lines containing self.camera.frame (not available in base Scene)
    lines = code.split('\n')
    sanitized_lines = []
    skip_block = False
    indent_level = 0
    
    for i, line in enumerate(lines):
        # Check if line contains camera.frame
        if 'self.camera.frame' in line or 'camera.frame' in line:
            # Skip this line and any continuation
            skip_block = True
            indent_level = len(line) - len(line.lstrip())
            print(f"⚠️  Removing camera.frame usage at line {i+1}: {line.strip()[:80]}")
            continue
        
        # Check if we're in a skip block
        if skip_block:
            current_indent = len(line) - len(line.lstrip())
            # If line is indented more than the camera line, it's a continuation
            if line.strip() and current_indent > indent_level:
                print(f"⚠️  Removing continuation line {i+1}: {line.strip()[:80]}")
                continue
            else:
                skip_block = False
        
        sanitized_lines.append(line)
    
    sanitized_code = '\n'.join(sanitized_lines)
    
    # Also remove any MovingCameraScene or ThreeDScene inheritance
    sanitized_code = re.sub(r'class\s+(\w+)\s*\(\s*MovingCameraScene\s*\)', r'class \1(Scene)', sanitized_code)
    sanitized_code = re.sub(r'class\s+(\w+)\s*\(\s*ThreeDScene\s*\)', r'class \1(Scene)', sanitized_code)
    
    return sanitized_code


def push_manim_code(code: str) -> Path:
    """
    Save generated code to a unique file in the animations directory.
    
    Args:
        code: The processed Manim code to save
        
    Returns:
        Path to the saved file
    """
    # Sanitize code before saving
    code = sanitize_code(code)
    
    # Generate unique filename using UUID
    filename = f"animation_{uuid.uuid4()}.py"
    file_path = ANIMATION_DIR / filename
    
    with open(file_path, "w") as f:
        f.write(code)
    
    return file_path


def run_manim(file_path: Path) -> Tuple[bool, str, Path]:
    """
    Execute Manim animation using subprocess.
    
    Args:
        file_path: Path to the Python file containing Manim code
        
    Returns:
        Tuple[bool, str, Path]: (success status, error message or logs, video path)
    """
    try:
        result = subprocess.run(
            [
                "manim",
                "-qm",
                "--format=mp4",
                str(file_path),
                "MainScene"
            ],
            capture_output=True,
            text=True,
            check=True
        )

        # Get the expected video path
        video_path = (
             Path("media") / "videos" / file_path.stem / "720p30"/"MainScene.mp4" )
        
        max_attempts = 10
        for attempt in range(max_attempts):
            if video_path.exists():
                print(f"Video found at: {video_path} after {attempt} attempts")
                # Return success with stdout/stderr logs
                execution_logs = f"STDOUT:\n{result.stdout}\n\nSTDERR:\n{result.stderr}"
                return True, execution_logs, video_path
            else:
                print(f"Video file not found yet (attempt {attempt+1}/{max_attempts}), waiting...")
                time.sleep(1)
        
        # If we get here, the file wasn't found after all attempts
        error_msg = f"Video file not generated at {video_path} after {max_attempts} attempts. Manim stdout: {result.stdout}\nManim stderr: {result.stderr}"
        print(error_msg)
        return False, error_msg, Path("")
            
    except subprocess.CalledProcessError as e:
        error_msg = f"Manim execution failed: {e.stderr}"
        print(error_msg)
        return False, error_msg, Path("")
    except Exception as ex:
        error_msg = f"Unexpected error in run_manim: {str(ex)}"
        print(error_msg)
        return False, error_msg, Path("")


def upload_to_s3(file_path: Path, bucket_name: str, object_name: str) -> str:
    """
    Upload a file to an S3 bucket and generate a pre-signed URL.

    Args:
        file_path: Path to the file to upload.
        bucket_name: Name of the S3 bucket.
        object_name: S3 object name (key).

    Returns:
        str: Pre-signed URL for the uploaded file.

    Raises:
        Exception: If the upload or URL generation fails.
    """
    try:
        s3_client = boto3.client(
            's3',
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
            region_name=os.getenv("AWS_REGION")
        )

        # Upload the file to S3
        s3_client.upload_file(str(file_path), bucket_name, object_name)

        # Generate a pre-signed URL for the uploaded file
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': object_name},
            ExpiresIn=3600  # URL expires in 1 hour
        )

        return url

    except Exception as e:
        print(f"Error uploading to S3: {e}")
        raise Exception(f"Failed to upload file to S3: {str(e)}")


def generate_code(video_data: str) -> str:
    """
    Generate initial Manim code from video description.
    
    Args:
        video_data: Description of the video to generate
        
    Returns:
        Generated Python code
    """
    system_prompt = '''You are an expert in creating animated videos using the Manim Community v0.19.0 library.

You are tasked to generate a high quality animated video with the following data:

<video_data>
{video_data}
</video_data>

You are free to structure the video to your liking but keep the following things in mind:
 
- generate a python script using Manim Community v0.19.0 that creates the video described in the video_data section.
- If you decide to use multiple scenes, each scene should be defined as a separate class inheriting from `Scene` (or an appropriate Manim scene class). 
- Do not create a class aggregating these scenes
- Be aware of the screen size and resolution and make sure elements do not overlap or go out of frame
- Do NOT use external resources or dependencies like svg's, images, or other libraries.
- Do not adjust the manim configuration inside the code. Config adjustments like `config.quality` or `config.output_file` are forbidden.
- Each Scene should have a title at the top and contents which are displayed below.
- Keep in mind pacing and timing to ensure the video flows well and is engaging to watch.

Focus on creating an asthetically pleasing and engaging video, leveraging all feautures of the manim library.
This includes animated text, graphical elements, animations and more.

Start now by creating the code for the video, do not respond with anything else.'''

    response = client.chat.completions.create(
        model="openai/gpt-oss-120b:free",
        messages=[
            {"role": "system", "content": system_prompt.replace("{video_data}", video_data)},
            {"role": "user", "content": f"Generate Manim code for: {video_data}"}
        ],
        extra_body={"reasoning": {"enabled": True}}
    )

    if not response or not response.choices or not response.choices[0].message.content:
        raise Exception("No response from the model during code generation")

    return response.choices[0].message.content


def review_code(video_code: str, execution_logs: str, previous_reviews: str = "", 
                success_rate: float = 0.0, scenes_rendered: int = 0, total_scenes: int = 1) -> str:
    """
    Review generated Manim code and provide feedback.
    
    Args:
        video_code: The generated Manim code
        execution_logs: Logs from attempting to execute the code
        previous_reviews: Previous review feedback (if any)
        success_rate: Percentage of successful scenes
        scenes_rendered: Number of successfully rendered scenes
        total_scenes: Total number of scenes
        
    Returns:
        Review feedback as string
    """
    # Choose prompt based on success rate
    if success_rate >= 80.0:
        # Visual improvement prompt
        system_prompt = f'''You are an expert code reviewer specialized in the manim visualization library.

You will be receiving the current iteration of code <video_code> for a manim video that has rendered successfully with {success_rate}% of scenes working ({scenes_rendered} of {total_scenes}). Since the code is functionally working well, focus on VISUAL IMPROVEMENTS and CREATIVE ENHANCEMENTS.

Additionally you will receive: 
- Previous Reviews -> previous reviews of the current or past iterations of the code.
- Execution Logs / Errors -> The execution logs of the current code, which may contain useful error details. 

# Previous Reviews:
<previous_reviews>
{previous_reviews}
</previous_reviews>

# Video Code:
<video_code>
{video_code}
</video_code>

# Execution Logs:
<execution_logs>
{execution_logs}
</execution_logs>

Since the code is working well technically, conduct a thorough review focused on VISUAL ENHANCEMENTS and provide creative suggestions to make the animation more engaging, polished, and visually appealing.

If there are scenes that are not working yet, focus on fixing these critical issues first, while making only minor suggestions for the visual improvements.

IMPORTANT: Do not include things that were already mentioned in <previous_reviews>. Except for things that were not fixed.

Put special focus on the following aspects:

- Visual composition and layout improvements
- Creative use of manim features (transforms, morphing, camera movements)
- Visual hierarchy
- Background elements, decorative components
- Scene transitions and continuity
- Overall visual polish and professional appearance
- Be tasteful, do not overdo it, keep the styling minimal but elegant, according to modern design principles

Do NOT propose to use external resources or dependencies like svg's, images, or other libraries.
Do NOT propose config adjustments like `config.quality` in the review.
Do NOT respond with the improved code. Instead describe the changes that should be made.

Give feedback that will make the video more visually appealing and engaging, even if the current version works correctly.'''
    else:
        # Functional review prompt
        system_prompt = f'''You are an expert code reviewer specialized in the manim visualization libary.

You will be receiving the current iteration of code <video_code> for a manim video and you will have to review it for any potential issues or improvements.

Additionally you will receive: 
- Previous Reviews -> previous reviews of the current or past iterations of the code.
- Execution Logs / Errros -> The execution logs of the current code, which may contain useful error defails. 

# Previous Reviews:
<previous_reviews>
{previous_reviews}
</previous_reviews>

# Video Code:
<video_code>
{video_code}
</video_code>

# Execution Logs:
<execution_logs>
{execution_logs}
</execution_logs>

Conduct a thorough review of the code and provide feedback on all aspects regarding its functionality.

IMPORTANT: Do not include things that were already mentioned in <previous_reviews>. Except for things that were not fixed.

Put special focus on the following aspects:

- The code should only contain valid python syntax and proper use of the library.
- The video rendered by the code should have no elements that overlap.
- Only use functions that are part of the manim community v0.19.0 library or standard python libary.

Do NOT propose to use external resources or dependencies like svg's, images, or other libraries.
Do NOT propose config adjustments like `config.quality` in the review.
Do NOT respond with the improved code. Instead describe the changes that should be made.

Do not mention minor things like missing comments. Give feedback that is crucial to the functionality of the script.'''

    response = client.chat.completions.create(
        model="openai/gpt-oss-120b:free",
        messages=[
            {"role": "system", "content": system_prompt.replace("{previous_reviews}", previous_reviews)
                                                      .replace("{video_code}", video_code)
                                                      .replace("{execution_logs}", execution_logs)},
            {"role": "user", "content": "Review the code and provide feedback."}
        ],
        extra_body={"reasoning": {"enabled": True}}
    )

    if not response or not response.choices or not response.choices[0].message.content:
        raise Exception("No response from the model during code review")

    return response.choices[0].message.content


def improve_code(video_code: str, review_feedback: str) -> str:
    """
    Improve code based on review feedback.
    
    Args:
        video_code: Current Manim code
        review_feedback: Feedback from code review
        
    Returns:
        Improved Python code
    """
    system_prompt = '''You are an expert in the Manim Community v0.19.0 library.

You will receive:
- Current code for a Manim animation
- Review feedback describing issues and improvements needed

Your task is to apply the review feedback and generate improved code that addresses all the points mentioned.

IMPORTANT:
- Only use features available in Manim Community v0.19.0
- Do NOT use external resources (svg, images, other libraries)
- Do NOT adjust config settings in the code
- Output ONLY the improved Python code in a markdown code block
- Do not include explanations or comments

Generate the improved code now.'''

    response = client.chat.completions.create(
        model="openai/gpt-oss-120b:free",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Current Code:\n```python\n{video_code}\n```\n\nReview Feedback:\n{review_feedback}\n\nGenerate improved code:"}
        ],
        extra_body={"reasoning": {"enabled": True}}
    )

    if not response or not response.choices or not response.choices[0].message.content:
        raise Exception("No response from the model during code improvement")

    return response.choices[0].message.content


def generate_manim_animation(prompt: str, user_id: str | None = None, max_iterations: int = 3) -> tuple[str, str]:
    """
    Generate Manim animation with iterative improvement and return S3 key and pre-signed URL.

    Args:
        prompt: User's text description of the animation
        user_id: Optional user ID for user-specific S3 paths
        max_iterations: Maximum number of improvement iterations

    Returns:
        tuple[str, str]: (s3_key, presigned_url) - S3 object key and temporary pre-signed URL

    Raises:
        Exception: If animation generation or rendering fails
    """
    file_path = None
    video_path = None
    previous_reviews = ""
    
    try:
        # Step 1: Generate initial code
        print(f"Generating initial code for prompt: {prompt}")
        raw_code = generate_code(prompt)
        code = preprocess_code(raw_code)
        
        if not code:
            code = raw_code  # Fallback if no markdown code block found
        
        # Iterative improvement loop
        for iteration in range(max_iterations):
            print(f"\n=== Iteration {iteration + 1}/{max_iterations} ===")
            
            # Step 2: Save and test the code
            file_path = push_manim_code(code)
            success, logs, video_path = run_manim(file_path)
            
            if success:
                print(f"✅ Successfully rendered video on iteration {iteration + 1}")
                
                # Upload to S3
                bucket_name = os.getenv("AWS_S3_BUCKET")
                if not bucket_name:
                    raise Exception("AWS_S3_BUCKET environment variable not set")
                
                # Generate user-specific S3 key
                # Format: {user_id}_video_{timestamp}.mp4
                timestamp = int(time.time())
                filename = f"{user_id or 'anonymous'}_video_{timestamp}.mp4"
                s3_key = f"videos/{user_id or 'anonymous'}/{filename}"
                
                presigned_url = upload_to_s3(video_path, bucket_name, s3_key)
                print(f"✅ Uploaded to S3: {s3_key}")
                
                # Cleanup
                if file_path and file_path.exists():
                    file_path.unlink()
                
                return s3_key, presigned_url
            
            # Step 3: Review failed code
            print(f"❌ Rendering failed on iteration {iteration + 1}, reviewing code...")
            review = review_code(code, logs, previous_reviews, 0.0, 0, 1)
            previous_reviews += f"\n\n--- Iteration {iteration + 1} Review ---\n{review}"
            
            # Step 4: Improve code based on review
            if iteration < max_iterations - 1:  # Don't improve on last iteration
                print(f"🔧 Improving code based on review...")
                raw_improved = improve_code(code, review)
                improved_code = preprocess_code(raw_improved)
                
                if improved_code:
                    code = improved_code
                else:
                    code = raw_improved
                
                # Cleanup failed attempt
                if file_path and file_path.exists():
                    file_path.unlink()
            else:
                raise Exception(f"Failed to generate working animation after {max_iterations} iterations. Last error: {logs}")
        
        raise Exception(f"Failed to generate working animation after {max_iterations} iterations")
        
    except Exception as e:
        print(f"Error in generate_manim_animation: {str(e)}")
        # Cleanup on error
        if file_path and file_path.exists():
            file_path.unlink()
        raise Exception(f"Animation generation failed: {str(e)}")
