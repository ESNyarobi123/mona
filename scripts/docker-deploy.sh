#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  cp .env.docker.example .env
  POSTGRES_PASSWORD="$(openssl rand -hex 16)"
  AUTH_SECRET="$(openssl rand -hex 32)"
  JWT_SECRET="$(openssl rand -hex 32)"
  CRON_SECRET="$(openssl rand -hex 16)"
  sed -i.bak \
    -e "s/change-me-strong-db-password/${POSTGRES_PASSWORD}/" \
    -e "s/change-me-auth-secret-min-32-chars/${AUTH_SECRET}/" \
    -e "s/change-me-jwt-secret-min-32-chars/${JWT_SECRET}/" \
    -e "s/change-me-cron-secret/${CRON_SECRET}/" \
    .env 2>/dev/null || sed -i '' \
    -e "s/change-me-strong-db-password/${POSTGRES_PASSWORD}/" \
    -e "s/change-me-auth-secret-min-32-chars/${AUTH_SECRET}/" \
    -e "s/change-me-jwt-secret-min-32-chars/${JWT_SECRET}/" \
    -e "s/change-me-cron-secret/${CRON_SECRET}/" \
    .env
  rm -f .env.bak
fi

# shellcheck disable=SC1091
source .env 2>/dev/null || true
PUBLIC_IP="${PUBLIC_IP:-$(curl -sf --max-time 5 ifconfig.me || echo 178.104.240.204)}"

bash scripts/init-ssl.sh

echo "Building Monana stack..."
docker compose pull db 2>/dev/null || true
docker compose up -d --build

echo ""
docker compose ps
echo ""
echo "Monana HTTPS: https://${PUBLIC_IP}/"
echo "Admin login (if RUN_SEED=true): 255700000000 / admin123"
echo "WhatsApp QR: https://${PUBLIC_IP}/admin/whatsapp"
