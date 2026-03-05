import threading
from app.models.job import Job
from app.workers.manim_runner_v2 import generate_manim_animation
from typing import Tuple

def execute_job(
    job: Job,
    previous_code: str | None = None,
    cancel_event: threading.Event | None = None,
    custom_api_key: str | None = None,
    model_provider: str = "gemini",
) -> Tuple[str, str, str]:
    """
    Executes the core job logic.
    Returns (s3_key, presigned_url, generated_code) tuple.
    """
    s3_key, presigned_url, generated_code = generate_manim_animation(
        job.prompt,
        user_id=str(job.user_id),
        previous_code=previous_code,
        cancel_event=cancel_event,
        custom_api_key=custom_api_key,
        model_provider=model_provider,
    )
    return s3_key, presigned_url, generated_code
