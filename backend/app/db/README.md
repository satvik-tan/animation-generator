# Database Setup

## How Schema is Created

We use **SQLAlchemy models** as the single source of truth for database schema.

### Automatic Schema Creation

On application startup, `init_db()` runs and calls:
```python
Base.metadata.create_all(bind=engine)
```

This automatically:
- ✅ Creates all tables defined in `models/`
- ✅ Creates PostgreSQL ENUM types
- ✅ Creates all indexes defined in models
- ✅ Is **idempotent** (safe to run multiple times)

### For Managed Postgres

**First deployment:**
1. Set `DATABASE_URL` environment variable
2. Start the application
3. SQLAlchemy automatically creates all schema

**No manual SQL needed!** 🎉

### Schema Changes (Future)

If you need to modify schema later:

**Option 1: Development (Simple)**
```bash
# Drop all tables and recreate
# WARNING: Deletes all data!
python -c "from app.db.session import engine; from app.models.job import Base; Base.metadata.drop_all(engine); Base.metadata.create_all(engine)"
```

**Option 2: Production (Alembic - Recommended)**
```bash
# Install alembic
pip install alembic

# Initialize
alembic init alembic

# Auto-generate migration
alembic revision --autogenerate -m "description"

# Apply migration
alembic upgrade head
```

## Current Schema

### Jobs Table
- `id` - UUID primary key
- `user_id` - String (indexed)
- `prompt` - Text
- `status` - ENUM (queued/processing/completed/failed) (indexed)
- `result_url` - String (S3 pre-signed URL)
- `error_message` - Text
- `created_at` - Timestamp (indexed)
- `updated_at` - Timestamp (auto-updated)

### Users Table (Optional)
- `id` - String primary key
- `name` - String
- `email` - String (unique)
- `clerk_user_id` - String (unique)
- `created_at` - Timestamp
- `updated_at` - Timestamp

## Connection String Format

```bash
DATABASE_URL=postgresql://username:password@host:port/database

# Example (AWS RDS)
DATABASE_URL=postgresql://admin:mypassword@mydb.abc123.us-east-1.rds.amazonaws.com:5432/animations

# Example (local)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/animation_generator
```

## Troubleshooting

### "relation already exists"
✅ Safe to ignore - SQLAlchemy's `create_all()` is idempotent

### "type already exists" 
✅ Safe to ignore - ENUM type already created

### Connection issues
- Check `DATABASE_URL` format
- Verify database credentials
- Ensure database host is accessible
- Check firewall/security group rules
