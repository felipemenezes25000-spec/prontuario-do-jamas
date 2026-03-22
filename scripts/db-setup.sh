#!/bin/bash
set -euo pipefail

# VoxPEP Database Setup
# Usage: bash scripts/db-setup.sh
# Prerequisites: Docker, pnpm, Node.js

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "============================================"
echo "  VoxPEP - Database Setup"
echo "============================================"
echo ""

# 1. Start PostgreSQL and Redis
echo "[1/5] Starting PostgreSQL and Redis..."
docker compose -f "$PROJECT_ROOT/infra/docker-compose.yml" up -d postgres redis

# 2. Wait for PostgreSQL to be ready
echo "[2/5] Waiting for PostgreSQL to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
until docker exec voxpep-postgres pg_isready -U voxpep > /dev/null 2>&1; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
    echo "ERROR: PostgreSQL did not become ready in time."
    exit 1
  fi
  echo "  Waiting... ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 1
done
echo "  PostgreSQL is ready."

# 3. Ensure .env exists
echo "[3/5] Checking environment configuration..."
if [ ! -f "$PROJECT_ROOT/apps/api/.env" ]; then
  if [ -f "$PROJECT_ROOT/.env.development" ]; then
    cp "$PROJECT_ROOT/.env.development" "$PROJECT_ROOT/apps/api/.env"
    echo "  Copied .env.development -> apps/api/.env"
  else
    echo "ERROR: No .env.development found. Create apps/api/.env with DATABASE_URL."
    exit 1
  fi
else
  echo "  .env already exists."
fi

# 4. Run migrations
echo "[4/5] Running database migrations..."
cd "$PROJECT_ROOT/apps/api"
npx prisma migrate deploy

# 5. Seed database
echo "[5/5] Seeding database..."
npx prisma db seed

echo ""
echo "============================================"
echo "  Database setup complete!"
echo "  API: http://localhost:3000"
echo "  Web: http://localhost:5173"
echo "============================================"
