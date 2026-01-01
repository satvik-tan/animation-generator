from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
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
        user_id=user_id, #correct this later
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


@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_clerk_jwt),
):
    stmt = select(Job).where(Job.id == job_id)
    job = db.execute(stmt).scalar_one_or_none()

    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.user_id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    return JobResponse(
        job_id=job.id,
        status=job.status,
    )
