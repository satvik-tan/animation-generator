from sqlalchemy import Column, String, Text, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
import uuid
from enum import Enum
from datetime import datetime


Base = declarative_base()

class Status(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False, index=True)  # Index for faster user queries
    prompt = Column(Text, nullable=False)
    status = Column(
        SQLEnum(Status, name="job_status", create_type=True),
        nullable=False,
        default=Status.QUEUED,
        index=True  # Index for faster status queries
    )
    s3_key = Column(String, nullable=True)  # Permanent S3 object key (e.g., animations/user123/abc.mp4)
    result_url = Column(String, nullable=True)  # Temporary pre-signed URL (expires in 1 hour)
    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, index=True)  # Index for sorting
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
    clerk_user_id = Column(String, nullable=False, unique=True)


