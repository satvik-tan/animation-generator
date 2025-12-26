from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from uuid import uuid4

from app.schemas.jobs import CreateJobRequest, JobResponse
from app.models.job import Job
from app.db.session import get_db
from app.core.redis import redis_client
from app.core.auth import verify_clerk_jwt

router = APIRouter(prefix="/jobs")

@router.post("", response_model=JobResponse)
def create_job(
    req: CreateJobRequest,
    user_id: str = Depends(verify_clerk_jwt),
    db: Session = Depends(get_db),
):
    job = Job(
        id=uuid4(),
        user_id=user_id,
        prompt=req.prompt,
        status="QUEUED",
    )

    db.add(job)
    db.commit()

    redis_client.lpush("animation_jobs", str(job.id))

    return JobResponse(
        job_id=job.id,
        status=job.status,
    )
