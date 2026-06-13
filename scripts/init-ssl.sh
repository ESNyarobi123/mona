#!/usr/bin/env bash
# Generate TLS cert for Monana proxy (self-signed for IP, or Let's Encrypt for domain).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SSL_DIR="$ROOT/docker/nginx/ssl"
DOMAIN="${APP_DOMAIN:-}"
EMAIL="${SSL_EMAIL:-admin@monana.local}"
# Prefer IPv4 — ifconfig.me on the VPS often returns IPv6 and breaks browser trust for IP visits.
IP="${PUBLIC_IP:-178.104.240.204}"
if [[ -z "${PUBLIC_IP:-}" ]]; then
  IP="$(curl -4 -sf --max-time 5 ifconfig.me 2>/dev/null || echo 178.104.240.204)"
fi

mkdir -p "$SSL_DIR" docker/nginx/certbot-www

if [[ -n "$DOMAIN" ]]; then
  echo "Requesting Let's Encrypt cert for $DOMAIN ..."
  docker compose run --rm certbot certonly \
    --webroot -w /var/www/certbot \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos --no-eff-email --non-interactive || true

  if docker compose exec -T proxy test -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null; then
    docker cp "monana-proxy:/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/fullchain.pem" 2>/dev/null || true
    docker cp "monana-proxy:/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/privkey.pem" 2>/dev/null || true
    echo "Let's Encrypt cert installed for $DOMAIN"
    docker compose restart proxy
    exit 0
  fi
fi

echo "Creating self-signed cert for IP $IP ..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$SSL_DIR/privkey.pem" \
  -out "$SSL_DIR/fullchain.pem" \
  -subj "/CN=$IP/O=Monana/C=TZ" \
  -addext "subjectAltName=IP:$IP,DNS:localhost"

echo "Self-signed HTTPS ready for https://$IP/"
echo "Browser will still warn (no domain). For green padlock, set APP_DOMAIN + DNS A-record."
