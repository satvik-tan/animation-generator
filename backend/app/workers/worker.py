import time
import threading
import json
import os
import logging
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from redis import Redis

from app.db.session import SessionLocal
from app.models.job import Job, Status
from app.workers.executor import execute_job

# ── Worker identity (unique per process) ──
import uuid as _uuid

WORKER_ID = os.getenv("WORKER_ID", str(_uuid.uuid4())[:8])

# ── Logging setup ──
logging.basicConfig(
    level=logging.INFO,
    format=f"%(asctime)s [Worker-{WORKER_ID}] %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(f"worker-{WORKER_ID}")

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
                logger.info(f"🚫 Cancellation detected for job {job_id}")
                return
        finally:
            db.close()
        time.sleep(CANCEL_POLL_INTERVAL)


def worker_loop():
    logger.info(f"🟢 Worker-{WORKER_ID} started | PID={os.getpid()} | Waiting for jobs on '{QUEUE_NAME}'...")

    jobs_processed = 0

    while True:
        # Heartbeat: log every time we start waiting
        logger.info(f"⏳ Idle — waiting for next job (processed so far: {jobs_processed})")

        _, job_id = redis.brpop(QUEUE_NAME)
        job_id = UUID(job_id)
        start_time = time.time()

        logger.info(f"📥 RECEIVED job {job_id} from queue")

        db = SessionLocal()

        try:
            # 1️⃣ Claim job
            if not claim_job(db, job_id):
                logger.warning(f"⚠️ Job {job_id} already claimed by another worker — skipping")
                continue

            logger.info(f"✅ CLAIMED job {job_id} — status set to PROCESSING")

            # 2️⃣ Load job
            job = db.query(Job).filter(Job.id == job_id).one()
            logger.info(f"📋 Job details: user={job.user_id}, prompt='{job.prompt[:80]}...' parent={job.parent_job_id}")

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
                    logger.info(f"📦 Job metadata: model={model_provider}, has_custom_key={bool(custom_api_key)}")
                except json.JSONDecodeError:
                    logger.error(f"❌ Failed to parse job metadata for {job_id}")

            # 3️⃣ Check if this is an iteration (has parent_job_id)
            previous_code = None
            if job.parent_job_id:
                parent = db.query(Job).filter(Job.id == job.parent_job_id).one_or_none()
                if parent and parent.generated_code:
                    previous_code = parent.generated_code
                    logger.info(f"🔄 Iterating on parent job {job.parent_job_id} ({len(previous_code)} chars of code)")

            # 4️⃣ Start cancellation watcher in background thread
            cancel_event = threading.Event()
            cancel_thread = threading.Thread(
                target=_poll_for_cancellation,
                args=(job_id, cancel_event),
                daemon=True,
            )
            cancel_thread.start()

            # 5️⃣ Execute (check cancel_event after each LLM/render iteration)
            logger.info(f"🚀 EXECUTING job {job_id} — starting LLM + Manim pipeline...")
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
            elapsed = time.time() - start_time
            job.status = Status.COMPLETED
            job.s3_key = s3_key
            job.result_url = presigned_url
            job.generated_code = generated_code
            db.commit()

            jobs_processed += 1
            logger.info(f"🎉 COMPLETED job {job_id} in {elapsed:.1f}s | s3_key={s3_key} | total_processed={jobs_processed}")

        except JobCancelledError:
            elapsed = time.time() - start_time
            db.rollback()
            job = db.query(Job).filter(Job.id == job_id).one_or_none()
            if job:
                job.status = Status.CANCELLED
                db.commit()
            logger.warning(f"🚫 CANCELLED job {job_id} after {elapsed:.1f}s")

        except Exception as e:
            elapsed = time.time() - start_time
            db.rollback()
            job = db.query(Job).filter(Job.id == job_id).one_or_none()
            if job:
                job.status = Status.FAILED
                job.error_message = str(e)
                db.commit()
            logger.error(f"💥 FAILED job {job_id} after {elapsed:.1f}s | error={e}")

        finally:
            db.close()


if __name__ == "__main__":
    logger.info(f"🔧 Worker process starting... PID={os.getpid()} WORKER_ID={WORKER_ID}")
    worker_loop()
