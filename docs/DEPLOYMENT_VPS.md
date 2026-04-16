# Fiscally Backend - VPS Deployment Guide

This guide explains how to deploy the Fiscally backend to your own Virtual Private Server (VPS) using Docker Compose and Github Actions for Continuous Deployment (CI/CD).

## 1. Initial VPS Setup

You need a VPS (Ubuntu/Debian recommended) with Docker installed.

SSH into your VPS and run:
```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
sudo apt install -y docker.io docker-compose
sudo systemctl enable docker
sudo systemctl start docker

# Add your user to the docker group (optional but recommended)
sudo usermod -aG docker $USER
```

## 2. Deployment

Once everything is set up:
1. Commit your changes: `git add . && git commit -m "Configure VPS Deployment"`
2. Push to the `main` branch: `git push origin main`

The GitHub Action will automatically:
1. Copy the `backend/` directory to `~/fiscally/backend` on your VPS.
2. Build the Docker image natively and spin up both FastAPI and PostgreSQL instances.
3. Auto-run the Database Migrations (`alembic upgrade head`) before the server starts.


Your API will be accessible on your VPS IP address at `http://YOUR_VPS_IP:8000`.
To attach a domain and SSL, you can set up NGINX or Caddy as a reverse proxy in front of port 8000.
