#!/bin/bash
# ============================================================
# Deploy / Redeploy the Animation Generator
# Run from the project root: /opt/animation-generator
# ============================================================
set -e

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

echo "🚀 Deploying Animation Generator..."
echo "   Directory: $APP_DIR"

# ── Pre-flight checks ──
if [ ! -f backend/.env ]; then
    echo "❌ backend/.env not found! Create it first."
    exit 1
fi

# ── Pull latest code (if using git) ──
if [ -d .git ]; then
    echo "📥 Pulling latest code..."
    git pull origin main 2>/dev/null || git pull origin v3 || echo "⚠️ Git pull skipped"
fi

# ── Build and deploy ──
echo "🔨 Building Docker images..."
docker compose build --no-cache

echo "🔄 Restarting services..."
docker compose down
docker compose up -d

# ── Wait for health check ──
echo "⏳ Waiting for API to be healthy..."
for i in $(seq 1 30); do
    if curl -sf http://localhost/health > /dev/null 2>&1; then
        echo "✅ API is healthy!"
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo "❌ API failed to start within 30s"
        echo "   Checked endpoint: http://localhost/health"
        echo "   Check logs: docker compose logs -f api"
        exit 1
    fi
    sleep 1
done

# ── Show status ──
echo ""
echo "========================================="
echo "  ✅ Deployment complete!"
echo "========================================="
docker compose ps
echo ""
echo "📊 Logs: docker compose logs -f api"
echo "🔍 Workers: docker compose logs -f api | grep Worker"
echo "📡 Redis queue: docker compose exec redis redis-cli llen job_queue"
