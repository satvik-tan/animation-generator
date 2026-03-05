from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.jobs import router as jobs_router
from app.db.session import init_db
import os

app = FastAPI()

# CORS configuration — supports multiple origins via comma-separated FRONTEND_URL
_raw_origins = os.getenv("FRONTEND_URL", "http://localhost:5173")
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    print("🚀 Application starting up...")
    try:
        init_db()
        print("✅ Database initialization complete")
    except Exception as e:
        print(f"❌ Error during startup: {e}")
        import traceback
        traceback.print_exc()

app.include_router(jobs_router)

@app.get("/health")
def health_check():
    """Health check endpoint - no auth required"""
    return {"status": "ok"}
