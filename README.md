# Ory Auth App

Next.js demo of **Ory Kratos** self-service auth: login, registration, recovery, and social OIDC — with local Postgres via Docker Compose.

## Quick start

```bash
# 1) Identity stack
docker compose up -d

# 2) Next.js UI
npm install
cp .env.example .env.local   # if present; otherwise set Ory public URL
npm run dev
```

- App: [http://localhost:3000](http://localhost:3000)
- Kratos public API: typically `http://localhost:4433` (see `docker-compose.yml` / `kratos/`)

## What this shows

- Browser flows for login / registration / recovery
- Middleware-protected routes
- Optional Google / GitHub OIDC (configure in Kratos)

## Stack

Next.js · Ory Kratos · Postgres · Docker Compose
