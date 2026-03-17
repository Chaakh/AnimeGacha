#!/usr/bin/env bash

set -euo pipefail

DOMAIN="${1:-your-subdomain.duckdns.org}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TEMPLATE_PATH="${REPO_ROOT}/deploy/nginx.animegacha-api.conf"
TARGET_PATH="/etc/nginx/sites-available/animegacha-api"
ENABLED_PATH="/etc/nginx/sites-enabled/animegacha-api"

if [[ ! -f "${TEMPLATE_PATH}" ]]; then
    echo "Template not found: ${TEMPLATE_PATH}"
    exit 1
fi

echo "[1/7] Installing nginx + certbot"
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

echo "[2/7] Building AnimeGacha backend"
npm ci
npm run build

echo "[3/7] Installing systemd service"
sudo cp "${REPO_ROOT}/deploy/animegacha.service" /etc/systemd/system/animegacha.service
sudo systemctl daemon-reload
sudo systemctl enable --now animegacha

echo "[4/7] Writing nginx config for ${DOMAIN}"
TMP_CONFIG="$(mktemp)"
trap 'rm -f "${TMP_CONFIG}"' EXIT

sed "s/server_name .*/server_name ${DOMAIN};/" "${TEMPLATE_PATH}" > "${TMP_CONFIG}"
sudo cp "${TMP_CONFIG}" "${TARGET_PATH}"

echo "[5/7] Enabling site"
sudo ln -sf "${TARGET_PATH}" "${ENABLED_PATH}"

echo "[6/7] Validating and reloading nginx"
sudo nginx -t
sudo systemctl reload nginx

echo "[7/7] Issuing HTTPS certificate"
sudo certbot --nginx -d "${DOMAIN}"

echo
echo "Done. Next steps:"
echo "  1) Set CORS_ORIGINS in /etc/systemd/system/animegacha.service"
echo "     Example: CORS_ORIGINS=https://<your-github-username>.github.io"
echo "  2) Restart service: sudo systemctl restart animegacha"
echo "  3) GitHub variable: NUXT_PUBLIC_API_BASE=https://${DOMAIN}"
