from pydantic import BaseModel
from uuid import UUID

class CreateJobRequest(BaseModel):
    prompt: str

class JobResponse(BaseModel):
    job_id: UUID
    status: str


