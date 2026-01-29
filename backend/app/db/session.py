from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize database tables using SQLAlchemy models"""
    try:
        print("🔄 Initializing database...")
        from app.models.job import Base
        print("✅ Models imported successfully")
        
        # This will create tables AND indexes defined in models
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables and indexes created successfully")
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        import traceback
        traceback.print_exc()
        raise
