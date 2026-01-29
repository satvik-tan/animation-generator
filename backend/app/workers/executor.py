from app.models.job import Job
from app.workers.manim_runner_v2 import generate_manim_animation
from typing import Tuple

def execute_job(job: Job) -> Tuple[str, str]:
    """
    Executes the core job logic.
    Returns (s3_key, presigned_url) tuple.
    """
    # Generate animation and return S3 key and pre-signed URL
    # Pass user_id for user-specific S3 paths
    s3_key, presigned_url = generate_manim_animation(job.prompt, user_id=str(job.user_id))
    return s3_key, presigned_url
