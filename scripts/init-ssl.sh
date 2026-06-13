#!/usr/bin/env bash
# Generate TLS cert for Monana proxy (self-signed for IP, or Let's Encrypt for domain).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SSL_DIR="$ROOT/docker/nginx/ssl"
DOMAIN="${APP_DOMAIN:-}"
EMAIL="${SSL_EMAIL:-admin@monana.local}"
IP="${PUBLIC_IP:-$(curl -sf --max-time 5 ifconfig.me 2>/dev/null || echo 178.104.240.204)}"

mkdir -p "$SSL_DIR" docker/nginx/certbot-www

if [[ -f "$SSL_DIR/fullchain.pem" && -f "$SSL_DIR/privkey.pem" ]]; then
  echo "SSL certs already exist in docker/nginx/ssl/"
  exit 0
fi

if [[ -n "$DOMAIN" ]]; then
  echo "Requesting Let's Encrypt cert for $DOMAIN ..."
  docker compose run --rm certbot certonly \
    --webroot -w /var/www/certbot \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos --no-eff-email --non-interactive || true

  if docker compose exec -T proxy test -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null; then
    cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/" 2>/dev/null || \
      docker cp "monana-proxy:/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/fullchain.pem"
    docker cp "monana-proxy:/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/privkey.pem" 2>/dev/null || true
    echo "Let's Encrypt cert installed for $DOMAIN"
    exit 0
  fi
fi

echo "Creating self-signed cert for IP $IP (use APP_DOMAIN for Let's Encrypt) ..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$SSL_DIR/privkey.pem" \
  -out "$SSL_DIR/fullchain.pem" \
  -subj "/CN=$IP/O=Monana/C=TZ"
echo "Self-signed HTTPS ready — browser may show security warning until you set APP_DOMAIN."
