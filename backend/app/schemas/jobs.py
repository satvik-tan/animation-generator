from pydantic import BaseModel
from uuid import UUID
from typing import Optional, Literal
from datetime import datetime

class CreateJobRequest(BaseModel):
    prompt: str
    parent_job_id: Optional[UUID] = None  # For iteration: reference the previous animation
    custom_api_key: Optional[str] = None  # User's own Gemini API key (not stored in DB)
    model_provider: Optional[Literal['gemini', 'groq']] = 'gemini'  # Model selection

class JobResponse(BaseModel):
    job_id: UUID
    status: str
    result_url: Optional[str] = None
    error_message: Optional[str] = None
    prompt: Optional[str] = None
    parent_job_id: Optional[UUID] = None
    created_at: Optional[datetime] = None


