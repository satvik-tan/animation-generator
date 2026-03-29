# DigitalOcean Deployment (Simple, No Nginx, No Tunnel)

This guide deploys your existing single container stack as-is.
- API + workers stay together in one service.
- No Nginx.
- No Cloudflare Tunnel.
- Domain points directly to the Droplet IP.

## 1. Create Droplet

Recommended:
- Ubuntu 24.04 LTS
- 2 GB RAM minimum (4 GB preferred for multiple workers)
- SSH key auth enabled

## 2. Point Domain to Droplet

In your DNS provider, create:
- Type: `A`
- Name: `api` (or your chosen subdomain)
- Value: `<DROPLET_PUBLIC_IP>`

Example result: `api.yourdomain.com`

## 3. Server Setup

SSH into the droplet and run:

```bash
ssh root@<DROPLET_PUBLIC_IP>
cd /tmp
curl -sSL https://raw.githubusercontent.com/satvik-tan/animation-generator/v3/deploy/setup-droplet.sh -o setup-droplet.sh
bash setup-droplet.sh
```

What this does:
- installs Docker
- installs Docker Compose plugin
- enables firewall for SSH + HTTP (80)

## 4. Deploy App

```bash
cd /opt
git clone https://github.com/satvik-tan/animation-generator.git
cd animation-generator
git checkout v3

cp backend/.env.example backend/.env
nano backend/.env
```

Set at least:
- `DATABASE_URL`
- `GEMINI_API_KEY`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_S3_BUCKET`
- `FRONTEND_URL`
- `WORKER_COUNT` (start with `2` or `3`)

Start:

```bash
docker compose up -d --build
```

## 5. Verify

```bash
docker compose ps
curl http://localhost:8000/health
curl http://api.yourdomain.com/health
docker compose logs -f api
```

Expected:
- health returns `{\"status\":\"ok\"}`
- logs show worker startup lines like `Worker-w1`, `Worker-w2`

## 6. Update Later (Manual, No CI/CD)

```bash
cd /opt/animation-generator
git pull origin v3
docker compose up -d --build
```

Or use:

```bash
./deploy/deploy.sh
```

## Notes

- With this setup, public traffic reaches your app directly on HTTP port 80.
- Redis remains private (`127.0.0.1:6379`) and is not internet-exposed.
- If you want HTTPS later, add either Nginx+Caddy+certbot, or Cloudflare proxy.
