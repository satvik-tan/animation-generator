from fastapi import FastAPI, HTTPException, File, UploadFile
from openai import OpenAI
import os
from dotenv import load_dotenv
from pydantic import BaseModel
from pathlib import Path
import uuid
from markdown_it import MarkdownIt
import subprocess 
from typing import Tuple
from fastapi.responses import FileResponse
import time

app = FastAPI()
load_dotenv()

client = OpenAI(
    api_key= os.getenv("GEMINI_API_KEY"),
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
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


def push_manim_code(code: str) -> Path:
    """
    Save generated code to a unique file in the animations directory.
    
    Args:
        code: The processed Manim code to save
        
    Returns:
        Path to the saved file
    """
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
        Tuple[bool, str, Path]: (success status, error message, video path)
    """
    try:
        # Don't wrap command in another list
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
                return True, "", video_path
            else:
                # Wait and retry
                print(f"Video file not found yet (attempt {attempt+1}/{max_attempts}), waiting...")
                time.sleep(1)  # Wait 1 second between checks
        
        # If we get here, the file wasn't found after all attempts
        print(f"Video file not generated at {video_path} after {max_attempts} attempts. Manim stdout: {result.stdout}")
        print(f"Manim stderr: {result.stderr}")
        return False, f"Video file not generated at {video_path} after {max_attempts} attempts", Path("")
            
    except subprocess.CalledProcessError as e:
        print(f"Manim execution failed: {e.stderr}")
        return False, f"Manim execution failed: {e.stderr}", Path("")
    except Exception as ex:
        print(f"Unexpected error in run_manim: {str(ex)}")
        return False, f"An unexpected error occurred: {str(ex)}", Path("")

        

class AnimationRequest(BaseModel):
    prompt: str = "Create a simple animation of a bouncing ball , bounces 5 times each time different color"
    class_name: str = "MyScene"



@app.post("/generate-animation")
async def generate_animation(request: AnimationRequest):
    try:
        system_prompt = f'''Generate complete and runnable Python code using the Manim Community library for a high-quality animation.

The scene class must be named `MainScene` and adhere to the following specifications:

Technical Requirements:
- Use `from manim import *` for imports
- The class must inherit from `Scene`
- All animation logic must be contained within the `construct(self)` method
- Use precise RGB or hex color codes instead of named colors (e.g., use "#FF5733" instead of RED)
- Specify animation durations using the `run_time` parameter
- Use easing functions like `smooth`, `linear`, `there_and_back`, etc., for natural motion
- When creating polygons with custom vertices, use `Polygon(v1, v2, v3, ..., **kwargs)` — do NOT use a `points=[...]` keyword argument for `Polygon` or `Triangle`
- For default equilateral triangles, use `Triangle(**kwargs)` only

Animation Quality Guidelines:
- Include at least 3 different types of animations (e.g., `Create`, `Transform`, `FadeIn`)
- Ensure smooth transitions between scenes and objects
- Use `arrange()` or `next_to()` for clean layout and spacing
- Apply layering and z-index control when objects overlap
- Include camera movement (e.g., `self.camera.frame.animate.scale()` or `.move_to()`) where appropriate

Visual Enhancement Requirements:
- Use `stroke_width` for visual clarity of lines and shapes
- Apply `fill_opacity` to shapes and use solid or gradient fills
- Add color gradients where visually suitable
- Set text font sizes and styles clearly
- For LaTeX text, adjust `dot_spacing`, `font_size`, and rendering parameters for better clarity

Best Practices:
- Group related objects using `VGroup`
- Use `wait()` with specific durations to pace the animation
- Add `rate_func` for smoother or custom animation curves
- Remove or fade out elements that are no longer needed
- Use updaters for dynamic or interactive animations
- Maintain clear visual hierarchy with padding and spacing

Important Output Requirements:
- The output code must be a single valid Manim Python script
- The animation should be 5–10 seconds long
- Do not include explanatory comments or markdown — provide only the raw code block
- Ensure visual balance, compositional clarity, and a professional polish
- Manim Community v0.19.0 , only use sytax and features available in this version
- Do not use any other libraries or modules


Only output a complete and runnable Python code block, and nothing else.
'''

            
        response = client.chat.completions.create(
            model="gemini-2.0-flash",
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": request.prompt
                }
            ]
        )


        if not response or not response.choices:
            raise HTTPException(status_code=500, detail="No response from the model")
            
        unprocess_code = response.choices[0].message.content
        code = preprocess_code(unprocess_code)
        
        # Save code to file and get path
        file_path = push_manim_code(code)
        
        print(f"Animation code saved to: {file_path}")

        # Run manim and handle the response
        success, error_msg, video_path = run_manim(file_path)
        
        if not success:
            raise HTTPException(status_code=500, detail=error_msg)

        if not video_path.exists():
            raise HTTPException(
                status_code=500, 
                detail="Video file not found after generation"
            )

        return FileResponse(
            path=str(video_path),
            media_type="video/mp4",
            filename=f"animation_{file_path.stem}_MainScene.mp4",
        )
        
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Animation generation failed: {str(e)}"
        )
    finally:
        # Clean up the generated Python file
        if 'file_path' in locals() and file_path.exists():
            file_path.unlink()



