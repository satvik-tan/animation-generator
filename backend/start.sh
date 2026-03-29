#!/bin/bash
set -e

echo "🚀 Starting Animation Generator..."

# Number of worker processes to spawn (default: 5)
WORKER_COUNT=${WORKER_COUNT:-5}

# Track spawned worker PIDs for clean shutdown
WORKER_PIDS=()

cleanup() {
    echo "🛑 Shutting down workers..."
    for pid in "${WORKER_PIDS[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
    exit 0
}
trap cleanup SIGTERM SIGINT

# Run Alembic migrations before starting
echo "🔄 Running database migrations..."
alembic upgrade head || echo "⚠️ Alembic migration failed (tables may already exist)"

# Start N worker processes in the background with unique IDs
echo "📦 Starting $WORKER_COUNT worker processes..."
for i in $(seq 1 "$WORKER_COUNT"); do
    WORKER_ID="w$i" python -m app.workers.worker &
    WORKER_PIDS+=($!)
    echo "  ✅ Worker w$i started (PID ${WORKER_PIDS[-1]})"
done

# Start the API server in the foreground
echo "🌐 Starting API server..."
uvicorn app.main:app --host 0.0.0.0 --port 8000
