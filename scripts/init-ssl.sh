#!/usr/bin/env bash
# TLS for Monana proxy: Let's Encrypt when APP_DOMAIN is set, else self-signed for PUBLIC_IP.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
SSL_DIR="$ROOT/docker/nginx/ssl"
DOMAIN="${APP_DOMAIN:-}"
EMAIL="${SSL_EMAIL:-admin@monana.local}"
IP="${PUBLIC_IP:-178.104.240.204}"
if [[ -z "${PUBLIC_IP:-}" ]]; then
  IP="$(curl -4 -sf --max-time 5 ifconfig.me 2>/dev/null || echo 178.104.240.204)"
fi

mkdir -p "$SSL_DIR" docker/nginx/certbot-www

copy_le_certs() {
  local vol
  vol="$(docker volume ls -q | grep certbot_conf | head -1)"
  if [[ -z "$vol" ]]; then
    vol="monana_certbot_conf"
  fi
  docker run --rm \
    -v "${vol}:/etc/letsencrypt:ro" \
    -v "$SSL_DIR:/out" \
    alpine:3.20 \
    sh -c "test -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem && cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /out/fullchain.pem && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /out/privkey.pem && chmod 644 /out/fullchain.pem && chmod 600 /out/privkey.pem"
}

if [[ -n "$DOMAIN" ]]; then
  echo "Requesting Let's Encrypt certificate for $DOMAIN ..."
  docker compose up -d proxy

  docker compose --profile certbot run --rm certbot certonly \
    --webroot -w /var/www/certbot \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos --no-eff-email --non-interactive

  copy_le_certs

  if [[ -f "$SSL_DIR/fullchain.pem" ]]; then
    echo "Let's Encrypt certificate installed for https://$DOMAIN/"
    docker compose restart proxy
    exit 0
  fi

  echo "WARNING: Let's Encrypt failed for $DOMAIN — keeping existing cert if any." >&2
  exit 1
fi

if [[ -f "$SSL_DIR/fullchain.pem" && -f "$SSL_DIR/privkey.pem" ]]; then
  echo "TLS cert already present in $SSL_DIR — skipping self-signed generation."
  exit 0
fi

echo "Creating self-signed certificate for IP $IP ..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$SSL_DIR/privkey.pem" \
  -out "$SSL_DIR/fullchain.pem" \
  -subj "/CN=$IP/O=Monana/C=TZ" \
  -addext "subjectAltName=IP:$IP,DNS:localhost"

echo "Self-signed HTTPS ready for https://$IP/"
echo "For a trusted padlock, point DNS to this server and set APP_DOMAIN in .env"
