from app.models.job import Job
from app.workers.manim_runner_v2 import generate_manim_animation
from typing import Tuple

def execute_job(job: Job, previous_code: str | None = None) -> Tuple[str, str, str]:
    """
    Executes the core job logic.
    Returns (s3_key, presigned_url, generated_code) tuple.
    """
    s3_key, presigned_url, generated_code = generate_manim_animation(
        job.prompt,
        user_id=str(job.user_id),
        previous_code=previous_code,
    )
    return s3_key, presigned_url, generated_code
