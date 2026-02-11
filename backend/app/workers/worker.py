import time
from uuid import UUID
from sqlalchemy.orm import Session
from redis import Redis

from app.db.session import SessionLocal
from app.models.job import Job, Status
from app.workers.executor import execute_job

redis = Redis(host="redis", port=6379, decode_responses=True)

QUEUE_NAME = "job_queue"

def claim_job(db: Session, job_id: UUID) -> bool:
    result = (
        db.query(Job)
        .filter(Job.id == job_id, Job.status == Status.QUEUED)
        .update({"status": Status.PROCESSING})
    )
    db.commit()
    return result == 1


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

            # 3️⃣ Check if this is an iteration (has parent_job_id)
            previous_code = None
            if job.parent_job_id:
                parent = db.query(Job).filter(Job.id == job.parent_job_id).one_or_none()
                if parent and parent.generated_code:
                    previous_code = parent.generated_code
                    print(f"🔄 Iterating on parent job {job.parent_job_id}")

            # 4️⃣ Execute
            s3_key, presigned_url, generated_code = execute_job(job, previous_code=previous_code)

            # 5️⃣ Mark completed
            job.status = Status.COMPLETED
            job.s3_key = s3_key
            job.result_url = presigned_url
            job.generated_code = generated_code
            db.commit()

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
