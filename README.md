# AnimeGacha

Anime-themed gacha web app built with Nuxt 4.

## Production topology (same style as TheMind)

- Frontend: GitHub Pages (static output from `npm run generate`)
- Backend API: this repo running on your VPS (`node .output/server/index.mjs`)
- Public API domain: DuckDNS + nginx + certbot

For full VPS + Pages instructions, see `deploy/SETUP.md`.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

## GitHub Pages variable required

Add this repository variable before running the Pages workflow:

```text
NUXT_PUBLIC_API_BASE=https://your-subdomain.duckdns.org
```
