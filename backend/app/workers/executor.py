import threading
import logging
import time

from app.models.job import Job
from app.workers.manim_runner_v2 import generate_manim_animation
from typing import Tuple

logger = logging.getLogger(__name__)

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
    logger.info(f"🎬 execute_job START | job={job.id} | model={model_provider} | iterating={previous_code is not None}")
    start = time.time()

    try:
        s3_key, presigned_url, generated_code = generate_manim_animation(
            job.prompt,
            user_id=str(job.user_id),
            previous_code=previous_code,
            cancel_event=cancel_event,
            custom_api_key=custom_api_key,
            model_provider=model_provider,
        )
        elapsed = time.time() - start
        logger.info(f"🎬 execute_job DONE | job={job.id} | {elapsed:.1f}s | code_len={len(generated_code)}")
        return s3_key, presigned_url, generated_code
    except Exception as e:
        elapsed = time.time() - start
        logger.error(f"🎬 execute_job FAILED | job={job.id} | {elapsed:.1f}s | error={e}")
        raise
