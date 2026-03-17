# AnimeGacha production setup

## 1) Build backend once

```bash
npm install
npm run build
```

## 2) Install systemd service

```bash
sudo cp deploy/animegacha.service /etc/systemd/system/animegacha.service
sudo systemctl daemon-reload
sudo systemctl enable --now animegacha
sudo systemctl status animegacha
```

Before starting, edit `/etc/systemd/system/animegacha.service`:

- Set `User` and `WorkingDirectory` for your server
- Set `CORS_ORIGINS` to your Pages origin

Example:

```text
CORS_ORIGINS=https://<your-github-username>.github.io
```

Then reload after edits:

```bash
sudo systemctl daemon-reload
sudo systemctl restart animegacha
```

## 3) Install nginx + HTTPS for DuckDNS

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

Copy and enable nginx site:

```bash
sudo cp deploy/nginx.animegacha-api.conf /etc/nginx/sites-available/animegacha-api
sudo ln -sf /etc/nginx/sites-available/animegacha-api /etc/nginx/sites-enabled/animegacha-api
sudo nginx -t
sudo systemctl reload nginx
```

Edit `/etc/nginx/sites-available/animegacha-api` and set:

```text
server_name <your-subdomain>.duckdns.org;
```

Issue cert:

```bash
sudo certbot --nginx -d <your-subdomain>.duckdns.org
```

Quick checks:

```bash
curl -I https://<your-subdomain>.duckdns.org/health
curl -I https://<your-subdomain>.duckdns.org/api/health
```

## 4) GitHub Pages frontend

This repo includes `.github/workflows/deploy-pages.yml`.

In GitHub repo settings:

1. Pages source: `GitHub Actions`
2. Add repository variable:

```text
NUXT_PUBLIC_API_BASE=https://<your-subdomain>.duckdns.org
```

Then push to `main` (or run workflow manually).

## 5) Optional one-shot helper script

You can run:

```bash
./deploy/setup_https_backend.sh <your-subdomain>.duckdns.org
```

This installs nginx/certbot, builds the app, installs service, enables nginx, and requests HTTPS.

## Example with your current public IP

If DuckDNS has already been pointed to `31.208.15.69`, your API should resolve after DNS propagation and cert setup.
