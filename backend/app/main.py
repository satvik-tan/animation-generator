from fastapi import FastAPI
from app.api.jobs import router as jobs_router
from app.db.session import init_db

app = FastAPI()

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
