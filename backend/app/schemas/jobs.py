from pydantic import BaseModel
from uuid import UUID
from typing import Optional

class CreateJobRequest(BaseModel):
    prompt: str

class JobResponse(BaseModel):
    job_id: UUID
    status: str
    result_url: Optional[str] = None
    error_message: Optional[str] = None


