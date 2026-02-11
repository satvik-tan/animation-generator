from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime

class CreateJobRequest(BaseModel):
    prompt: str
    parent_job_id: Optional[UUID] = None  # For iteration: reference the previous animation

class JobResponse(BaseModel):
    job_id: UUID
    status: str
    result_url: Optional[str] = None
    error_message: Optional[str] = None
    prompt: Optional[str] = None
    parent_job_id: Optional[UUID] = None
    created_at: Optional[datetime] = None


