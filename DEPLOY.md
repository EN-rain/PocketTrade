# Deployment Guide — Used Phone Marketplace Backend (Docker)

The backend is shipped as a **Docker image** built from `backend/Dockerfile` and pushed to **GitHub Container Registry** (GHCR) at `ghcr.io/en-rain/market-app-backend`. The image is self-contained: it includes the compiled JS, Prisma client, and the migrations folder. The container runs `prisma migrate deploy` on every boot, then starts the NestJS server.

## Architecture

```
┌──────────────────────┐
│ GitHub repo (main)   │
└──────────┬───────────┘
           │ push
           ▼
┌──────────────────────┐    ┌──────────────────┐
│ GitHub Actions       │───▶│ GHCR              │
│ (.github/workflows/  │    │ ghcr.io/en-rain/  │
│  docker-image.yml)   │    │ market-app-backend│
└──────────────────────┘    └─────────┬────────┘
                                       │ docker pull
                                       ▼
            ┌─────────────────────────────────────┐
            │ Any Docker host (local, VPS,       │
            │ Fly.io, Railway, Render-Docker,    │
            │ DigitalOcean App Platform, etc.)   │
            │  container runs on port 3000       │
            └────────────┬────────────────────────┘
                         │
                ┌────────┴────────┐
                ▼                 ▼
       ┌────────────────┐  ┌──────────────────┐
       │ Neon Postgres   │  │ Cloudinary        │
       └────────────────┘  └──────────────────┘
```

## Build & push the image

### Local build (manual)

```bash
cd backend
docker build -t ghcr.io/en-rain/market-app-backend:latest .
docker push ghcr.io/en-rain/market-app-backend:latest
```

(Requires `docker login ghcr.io` with a PAT that has `write:packages` scope.)

### CI build (recommended)

The repo includes `.github/workflows/docker-image.yml`. On every push to `main` that touches `backend/**`, GitHub Actions builds and pushes a new image tagged with the commit SHA and `latest`. **First-time workflow approval is required** in the GitHub Actions UI (Settings → Actions → General → "Workflow permissions").

To enable: open https://github.com/EN-rain/Market-app/settings/actions and approve the pending workflow. Subsequent pushes will trigger automatic builds.

## Run locally with Docker

```bash
# 1. Pull the image
docker pull ghcr.io/en-rain/market-app-backend:latest

# 2. Run the container with env vars
docker run --rm -p 3000:3000 \
  -e DATABASE_URL='postgresql://neondb_owner:npg_kJxQ1h2wPVog@ep-morning-waterfall-ah2c220q.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require' \
  -e CLOUDINARY_URL='cloudinary://435712829819248:TCyZxJ4m9YpCGmyVNemFHk5QVr4@dyoaiyzzg' \
  -e CLOUDINARY_CLOUD_NAME='dyoaiyzzg' \
  -e CLOUDINARY_API_KEY='435712829819248' \
  -e CLOUDINARY_API_SECRET='TCyZxJ4m9YpCGmyVNemFHk5QVr4' \
  -e JWT_SECRET='<random-64-char-hex>' \
  -e JWT_ACCESS_TTL='15m' \
  -e JWT_REFRESH_TTL='30d' \
  -e ADMIN_BOOTSTRAP_PASSWORD='<strong-password>' \
  -e ADMIN_BOOTSTRAP_EMAIL='admin@example.com' \
  -e NODE_ENV=production \
  -e PORT=3000 \
  ghcr.io/en-rain/market-app-backend:latest
```

## Run on a VPS (Ubuntu 22.04)

```bash
# On the VPS:
sudo apt update && sudo apt install -y docker.io
sudo usermod -aG docker $USER  # log out + back in for group change

# Pull and run
docker pull ghcr.io/en-rain/market-app-backend:latest
docker run -d --name marketplace-api --restart unless-stopped -p 3000:3000 \
  -e DATABASE_URL='...' -e CLOUDINARY_URL='...' ... \
  ghcr.io/en-rain/market-app-backend:latest

# Verify
curl -s http://localhost:3000/health | jq
# { "status": "ok", "db": "ok", ... }
```

For HTTPS, put nginx or Caddy in front as a reverse proxy and point your domain's A record at the VPS IP.

## Run on Fly.io (free tier available)

```bash
# Install flyctl, then in repo root:
fly launch --image ghcr.io/en-rain/market-app-backend:latest --no-deploy
fly secrets set \
  DATABASE_URL='...' \
  CLOUDINARY_URL='...' \
  JWT_SECRET='...' \
  ADMIN_BOOTSTRAP_PASSWORD='...'
fly deploy
```

## Required env vars

| Key | Example | Source |
|-----|---------|--------|
| `DATABASE_URL` | `postgresql://...?sslmode=require` | Neon dashboard |
| `CLOUDINARY_URL` | `cloudinary://key:secret@cloud` | Cloudinary dashboard |
| `CLOUDINARY_CLOUD_NAME` | `dyoaiyzzg` | Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | `435712829819248` | Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | `TCyZxJ4m9YpCGmyVNemFHk5QVr4` | Cloudinary dashboard |
| `JWT_SECRET` | 64-char random hex | `openssl rand -hex 32` |
| `JWT_ACCESS_TTL` | `15m` | — |
| `JWT_REFRESH_TTL` | `30d` | — |
| `ADMIN_BOOTSTRAP_PASSWORD` | Strong password | You choose |
| `ADMIN_BOOTSTRAP_EMAIL` | `admin@example.com` | You choose |
| `NODE_ENV` | `production` | — |
| `PORT` | `3000` | — |

## Verify a live deployment

```bash
# Health check
curl -s https://your-domain.com/health | jq
# { "status": "ok", "db": "ok", "uptime": ..., "version": "0.0.1", "timestamp": "..." }

# Request an OTP (returns devCode in dev, just status in prod)
curl -s -X POST https://your-domain.com/auth/request-otp \
  -H 'Content-Type: application/json' \
  -d '{"mobileNumber":"+14155552671"}'

# Verify with the devCode from the seed log
curl -s -X POST https://your-domain.com/auth/verify-otp \
  -H 'Content-Type: application/json' \
  -d '{"mobileNumber":"+14155552671","code":"123456"}'

# List brands
curl -s https://your-domain.com/brands | jq '.[].name'
```

## Updating the image

When you push to `main`:
1. GitHub Actions rebuilds the image and pushes a new SHA tag + `latest`
2. Pull and restart on your host:
   ```bash
   docker pull ghcr.io/en-rain/market-app-backend:latest
   docker restart marketplace-api
   ```

## Rotating secrets

Rotate via the host's environment manager (systemd EnvironmentFile, docker-compose `.env`, Fly secrets, etc.) and restart the container. The next request will use the new value.

## Cost

| Component | Tier | Cost |
|-----------|------|------|
| GHCR image hosting | Free | $0 (1 GB storage free) |
| Neon Postgres | Free | $0 (0.5 GB) |
| Cloudinary | Free | $0 (25 credits/mo) |
| VPS (Hetzner/DO) | Smallest | $4–6/mo |
| **Self-hosted total** | | **~$4–6/mo** |
| Fly.io free allowance | — | $0 if low traffic |
