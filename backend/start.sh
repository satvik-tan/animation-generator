#!/bin/bash
set -e

echo "🚀 Starting Animation Generator..."

# Start the worker in the background
echo "📦 Starting worker process..."
python -m app.workers.worker &

# Start the API server in the foreground
echo "🌐 Starting API server..."
uvicorn app.main:app --host 0.0.0.0 --port 8000
