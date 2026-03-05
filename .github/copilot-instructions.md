# Animation Generator - AI Coding Instructions

## Architecture Overview
This is an AI-powered animation generator with an **asynchronous worker architecture** that converts text prompts to Manim animations via LLM processing.

### Core Components
- **FastAPI Backend** (`backend/app/`) - Job queue API and worker system
- **React Frontend** (`frontend/src/`) - TypeScript/Vite UI with shadcn/ui components  
- **Worker System** (`backend/app/workers/`) - Redis-based job processing
- **Docker Compose** - Orchestrates API + Redis services

## Worker Architecture Patterns

### Job Processing Flow
1. **API Layer** (`api/jobs.py`) - Creates jobs, pushes to Redis queue
2. **Worker Loop** (`workers/worker.py`) - Claims jobs from Redis, executes via `executor.py`  
3. **Manim Runner** (`workers/manim_runner.py`) - LLM prompt → Manim code → MP4 video
4. **Database State** - Job status: `QUEUED` → `PROCESSING` → `COMPLETED/FAILED`

### Key Worker Patterns
```python
# Job claiming pattern (atomic Redis operations)
def claim_job(db: Session, job_id: UUID) -> bool:
    result = db.query(Job).filter(Job.id == job_id, Job.status == "queued").update({"status": "processing"})
    
# Worker execution flow
def execute_job(job: Job) -> str:
    video_path = generate_manim_animation(job.prompt)  # LLM → Manim → MP4
    return video_path

# Manim execution with cleanup
def generate_manim_animation(prompt: str) -> str:
    file_path = push_manim_code(llm_generated_code)  
    success, error, video_path = run_manim(file_path)
    file_path.unlink()  # Always cleanup temp files
    return str(video_path)
```

## Development Workflow

### Running Locally
```bash
# Start services
docker-compose up -d
# Worker runs inside API container alongside FastAPI server
```

### Testing Manim Code Generation
- **LLM System Prompt** in `manim_runner.py` enforces strict Manim v0.19.0 syntax
- **Scene Class**: Must be named `MainScene`, inherits from `Scene` 
- **Code Processing**: Extracts Python from LLM markdown using `markdown-it-py`

### File Structure Conventions
- `workers/` - All background processing logic
  - `worker.py` - Redis job queue consumer loop
  - `executor.py` - Job dispatch and orchestration  
  - `manim_runner.py` - LLM integration and Manim execution
- `models/job.py` - SQLAlchemy job entity with status enum
- `schemas/jobs.py` - Pydantic request/response models
- `db/session.py` - Database connection management

## Critical Dependencies
- **Manim Community v0.19.0** - Animation rendering (specific version matters)
- **Redis** - Job queue (requires `redis` hostname in Docker)
- **OpenAI-compatible API** - Uses Gemini via OpenAI client pattern
- **FFmpeg/LaTeX** - Required by Manim for video rendering

## Frontend Integration Points
- **Job Status Polling** - Frontend polls `/jobs/{job_id}` for completion
- **Video Delivery** - FileResponse returns MP4 directly from `media/videos/` 
- **Error Handling** - Worker failures update `job.error_message`

## Code Generation Specifics
- **Manim Constraints**: No `points=[]` for Polygons, use precise RGB colors, include `run_time` parameters
- **Video Path Logic**: `Path("media") / "videos" / file_path.stem / "720p30"/"MainScene.mp4"`
- **Cleanup Strategy**: Generated `.py` files deleted after execution in `finally` block

When modifying workers, ensure atomic job state transitions and proper error propagation to maintain queue reliability.