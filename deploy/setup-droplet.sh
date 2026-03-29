#!/bin/bash
# ============================================================
# Digital Ocean Droplet Setup Script
# Run this on a FRESH Ubuntu 22.04/24.04 Droplet
# ============================================================
set -e

echo "========================================="
echo "  Animation Generator — Droplet Setup"
echo "========================================="

# ── 1. System updates ──
echo "📦 Updating system packages..."
apt-get update && apt-get upgrade -y

# ── 2. Install Docker ──
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

# ── 3. Install Docker Compose plugin ──
echo "🐳 Installing Docker Compose..."
if ! docker compose version &> /dev/null; then
    apt-get install -y docker-compose-plugin
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already installed"
fi

# ── 4. Firewall setup ──
echo "🔒 Configuring firewall..."
ufw allow OpenSSH
ufw allow 80/tcp
# App is exposed on host port 80. Keep Redis private.
ufw --force enable
echo "✅ Firewall configured (SSH + HTTP)"

# ── 5. Create app directory ──
APP_DIR="/opt/animation-generator"
echo "📁 Creating app directory at $APP_DIR..."
mkdir -p "$APP_DIR"

echo ""
echo "========================================="
echo "  ✅ Base setup complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Clone your repo:  cd $APP_DIR && git clone <your-repo-url> ."
echo "  2. Create .env:      cp backend/.env.example backend/.env && nano backend/.env"
echo "  3. Deploy:           docker compose up -d --build"
echo "  4. Point DNS A record: api.yourdomain.com -> your Droplet IP"
echo "  5. Verify:           curl http://api.yourdomain.com/health"
echo ""
echo "Monitor logs:  docker compose logs -f api"
echo "Check health:  curl http://localhost:8000/health"
