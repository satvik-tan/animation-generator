import time
import threading
import json
import os
from uuid import UUID
from sqlalchemy.orm import Session
from redis import Redis

from app.db.session import SessionLocal
from app.models.job import Job, Status
from app.workers.executor import execute_job

redis = Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=int(os.getenv("REDIS_PORT", "6379")),
    decode_responses=True,
)

QUEUE_NAME = "job_queue"
CANCEL_POLL_INTERVAL = 2  # seconds - check every 2 seconds for faster response


class JobCancelledError(Exception):
    pass


def claim_job(db: Session, job_id: UUID) -> bool:
    result = (
        db.query(Job)
        .filter(Job.id == job_id, Job.status == Status.QUEUED)
        .update({"status": Status.PROCESSING})
    )
    db.commit()
    return result == 1


def _poll_for_cancellation(job_id: UUID, cancel_event: threading.Event):
    """
    Background thread: polls the DB every CANCEL_POLL_INTERVAL seconds.
    Sets cancel_event if the job status has been set to CANCELLED.
    """
    while not cancel_event.is_set():
        db = SessionLocal()
        try:
            job = db.query(Job).filter(Job.id == job_id).one_or_none()
            if job and job.status == Status.CANCELLED:
                cancel_event.set()
                return
        finally:
            db.close()
        time.sleep(CANCEL_POLL_INTERVAL)


def worker_loop():
    print("Worker started")

    while True:
        _, job_id = redis.brpop(QUEUE_NAME)
        job_id = UUID(job_id)

        db = SessionLocal()

        try:
            # 1️⃣ Claim job
            if not claim_job(db, job_id):
                continue  # already taken

            # 2️⃣ Load job
            job = db.query(Job).filter(Job.id == job_id).one()

            # 2.5️⃣ Retrieve job metadata from Redis (custom API key, model provider)
            job_metadata_key = f"job_metadata:{job_id}"
            job_metadata_json = redis.get(job_metadata_key)
            custom_api_key = None
            model_provider = "gemini"
            
            if job_metadata_json:
                try:
                    job_metadata = json.loads(job_metadata_json)
                    custom_api_key = job_metadata.get("custom_api_key")
                    model_provider = job_metadata.get("model_provider", "gemini")
                    print(f"📦 Job metadata: model={model_provider}, has_custom_key={bool(custom_api_key)}")
                except json.JSONDecodeError:
                    print(f"⚠️ Failed to parse job metadata for {job_id}")

            # 3️⃣ Check if this is an iteration (has parent_job_id)
            previous_code = None
            if job.parent_job_id:
                parent = db.query(Job).filter(Job.id == job.parent_job_id).one_or_none()
                if parent and parent.generated_code:
                    previous_code = parent.generated_code
                    print(f"🔄 Iterating on parent job {job.parent_job_id}")

            # 4️⃣ Start cancellation watcher in background thread
            cancel_event = threading.Event()
            cancel_thread = threading.Thread(
                target=_poll_for_cancellation,
                args=(job_id, cancel_event),
                daemon=True,
            )
            cancel_thread.start()

            # 5️⃣ Execute (check cancel_event after each LLM/render iteration)
            try:
                s3_key, presigned_url, generated_code = execute_job(
                    job, 
                    previous_code=previous_code, 
                    cancel_event=cancel_event,
                    custom_api_key=custom_api_key,
                    model_provider=model_provider,
                )
            finally:
                # Stop the watcher regardless of outcome
                cancel_event.set()
                # Clean up Redis metadata
                redis.delete(job_metadata_key)

            # 6️⃣ Mark completed
            job.status = Status.COMPLETED
            job.s3_key = s3_key
            job.result_url = presigned_url
            job.generated_code = generated_code
            db.commit()

        except JobCancelledError:
            db.rollback()
            job = db.query(Job).filter(Job.id == job_id).one_or_none()
            if job:
                job.status = Status.CANCELLED
                db.commit()
            print(f"🚫 Job {job_id} was cancelled.")

        except Exception as e:
            db.rollback()
            job = db.query(Job).filter(Job.id == job_id).one_or_none()
            if job:
                job.status = Status.FAILED
                job.error_message = str(e)
                db.commit()

        finally:
            db.close()


if __name__ == "__main__":
    print("🔧 Worker process starting...")
    worker_loop()
