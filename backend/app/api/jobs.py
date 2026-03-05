from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from uuid import uuid4
import json

from app.schemas.jobs import CreateJobRequest, JobResponse
from app.models.job import Job, Status
from app.db.session import get_db
from app.core.redis import redis_client
from app.core.auth import get_current_user_id
from app.core.s3_utils import generate_presigned_url

router = APIRouter(prefix="/jobs")

@router.post("", response_model=JobResponse)
def create_job(
    req: CreateJobRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    # If iterating, validate the parent job belongs to this user and is completed
    if req.parent_job_id:
        parent = db.execute(
            select(Job).where(Job.id == req.parent_job_id)
        ).scalar_one_or_none()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent job not found")
        if parent.user_id != user_id:
            raise HTTPException(status_code=403, detail="Forbidden")
        if parent.status != Status.COMPLETED:
            raise HTTPException(status_code=400, detail="Can only iterate on completed animations")

    job = Job(
        id=uuid4(),
        user_id=user_id,
        prompt=req.prompt,
        status=Status.QUEUED,
        parent_job_id=req.parent_job_id,
    )

    db.add(job)
    db.commit()

    # Push job ID to queue
    redis_client.lpush("job_queue", str(job.id))
    
    # Store job metadata (custom API key, model provider) in Redis temporarily
    # This avoids modifying the DB schema
    job_metadata = {
        "custom_api_key": req.custom_api_key,
        "model_provider": req.model_provider or "gemini",
    }
    redis_client.setex(
        f"job_metadata:{job.id}",
        3600,  # Expire after 1 hour
        json.dumps(job_metadata)
    )

    return JobResponse(
        job_id=job.id,
        status=job.status.value,
        prompt=job.prompt,
        parent_job_id=job.parent_job_id,
        created_at=job.created_at,
    )


@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
    refresh_url: bool = False,  # Optional query param to force URL refresh
):
    """
    Get job details. Optionally refresh the video URL if expired.
    Use ?refresh_url=true to force regeneration of the pre-signed URL.
    """
    stmt = select(Job).where(Job.id == job_id)
    job = db.execute(stmt).scalar_one_or_none()

    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.user_id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    # If refresh requested and job is completed, regenerate URL
    if refresh_url and job.status == Status.COMPLETED and job.s3_key:
        new_url = generate_presigned_url(job.s3_key)
        if new_url:
            job.result_url = new_url
            db.commit()

    return JobResponse(
        job_id=job.id,
        status=job.status.value,
        result_url=job.result_url,
        error_message=job.error_message,
        prompt=job.prompt,
        parent_job_id=job.parent_job_id,
        created_at=job.created_at,
    )

@router.get("")
def list_jobs(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    stmt = select(Job).where(Job.user_id == user_id).order_by(Job.created_at.desc())
    jobs = db.execute(stmt).scalars().all()

    return [
        JobResponse(
            job_id=job.id,
            status=job.status.value,
            result_url=job.result_url,
            error_message=job.error_message,
            prompt=job.prompt,
            parent_job_id=job.parent_job_id,
            created_at=job.created_at,
        )
        for job in jobs
    ]
   
 
@router.patch("/{job_id}", response_model=JobResponse)
def cancel_job(
    job_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Cancel a queued or processing job."""
    stmt = select(Job).where(Job.id == job_id)
    job = db.execute(stmt).scalar_one_or_none()

    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.user_id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    if job.status in (Status.COMPLETED, Status.FAILED, Status.CANCELLED):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel a job with status '{job.status.value}'"
        )

    job.status = Status.CANCELLED
    db.commit()

    return JobResponse(
        job_id=job.id,
        status=job.status.value,
        result_url=job.result_url,
        error_message=job.error_message,
        prompt=job.prompt,
        parent_job_id=job.parent_job_id,
        created_at=job.created_at,
    )

@router.post("/{job_id}/regenerate-url", response_model=JobResponse)
def regenerate_video_url(
    job_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Regenerate a fresh pre-signed URL for a completed job's video.
    Useful when the previous URL has expired (after 1 hour).
    """
    stmt = select(Job).where(Job.id == job_id)
    job = db.execute(stmt).scalar_one_or_none()

    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.user_id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    if job.status != Status.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail="Cannot regenerate URL for incomplete job"
        )

    if not job.s3_key:
        raise HTTPException(
            status_code=500,
            detail="No S3 key found for this job"
        )

    # Generate fresh pre-signed URL
    new_url = generate_presigned_url(job.s3_key)
    
    if not new_url:
        raise HTTPException(
            status_code=500,
            detail="Failed to generate pre-signed URL"
        )

    # Update the stored URL
    job.result_url = new_url
    db.commit()

    return JobResponse(
        job_id=job.id,
        status=job.status.value,
        result_url=job.result_url,
        error_message=job.error_message,
        prompt=job.prompt,
        parent_job_id=job.parent_job_id,
        created_at=job.created_at,
    )

