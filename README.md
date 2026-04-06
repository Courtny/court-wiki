# court-wiki

A modernized, self-hostable wiki platform built with Next.js 15, tRPC, and Prisma. Inspired by [Wiki.js](https://github.com/Requarks/wiki) with a fully React-based stack.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), Tailwind CSS, shadcn/ui |
| API | tRPC v11 |
| Database | PostgreSQL 16 via Prisma |
| Auth | Auth.js v5 (10+ OAuth providers + local) |
| Search | Typesense (pluggable — Postgres full-text also included) |
| Storage | Local disk or S3-compatible (pluggable) |
| Rendering | unified/remark (Markdown, AsciiDoc, diagrams, math) |
| Background Jobs | BullMQ + Redis |
| Monorepo | Turborepo + pnpm workspaces |

## Project Structure

```
court-wiki/
├── apps/
│   ├── web/        # Next.js 15 app (frontend + API)
│   └── worker/     # BullMQ background job worker
└── packages/
    ├── db/         # Prisma schema + client
    ├── auth/       # Auth.js v5 config + providers
    ├── core/       # Shared types + utilities
    ├── storage/    # Pluggable storage (local, S3)
    ├── search/     # Pluggable search (Typesense, Postgres)
    └── rendering/  # Remark/unified rendering pipeline
```

## Prerequisites

- [Node.js](https://nodejs.org) 20+
- [pnpm](https://pnpm.io) 9+
- [Docker](https://www.docker.com) (for local services)

## Local Development Setup

### 1. Clone and install

```sh
git clone https://github.com/Courtny/court-wiki.git
cd court-wiki
pnpm install
```

### 2. Configure environment

```sh
cp .env.example .env
```

Edit `.env` and fill in the required values:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/courtwiki"

# Auth
AUTH_SECRET="your-secret-here"   # generate with: openssl rand -base64 32

# OAuth providers (add only the ones you need)
AUTH_GITHUB_ID=""
AUTH_GITHUB_SECRET=""
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
# ... see .env.example for full list

# Storage (defaults to local)
STORAGE_PROVIDER="local"
STORAGE_LOCAL_PATH="./uploads"

# Search (defaults to postgres)
SEARCH_PROVIDER="postgres"

# Redis (for background jobs)
REDIS_URL="redis://localhost:6379"
```

### 3. Start local services

```sh
docker compose up -d postgres redis typesense
```

### 4. Set up the database

```sh
pnpm db:generate   # generate Prisma client
pnpm db:push       # push schema to database (dev)
```

### 5. Start the app

```sh
pnpm dev
```

- Web app: [http://localhost:3000](http://localhost:3000)
- Worker runs automatically alongside the web app in dev

## Production Deployment

### Option A: Self-hosted with Docker Compose

```sh
cp .env.example .env
# fill in production values

docker compose up -d
```

This starts:
- `web` — Next.js app on port 3000
- `worker` — BullMQ job processor
- `postgres` — PostgreSQL 16
- `redis` — Redis 7
- `typesense` — Typesense search engine

To expose it publicly, put a reverse proxy (nginx, Caddy, Traefik) in front of port 3000.

**Example Caddy config:**
```
wiki.yourdomain.com {
    reverse_proxy localhost:3000
}
```

### Option B: Cloud (Vercel + Railway)

#### Web app → Vercel

1. Import the repo into [Vercel](https://vercel.com)
2. Set root directory to `apps/web`
3. Add all environment variables from `.env.example`
4. Deploy

#### Worker + services → Railway

1. Create a new [Railway](https://railway.app) project
2. Add services: PostgreSQL, Redis, Typesense
3. Deploy `apps/worker` as a separate service
4. Point `DATABASE_URL` and `REDIS_URL` to Railway service URLs

## Database Management

```sh
pnpm db:generate    # regenerate Prisma client after schema changes
pnpm db:push        # sync schema to DB without migrations (dev only)
pnpm db:migrate     # create and run a migration (production)
pnpm db:studio      # open Prisma Studio GUI
```

## Available Scripts

```sh
pnpm dev            # start all apps in development mode
pnpm build          # build all apps and packages
pnpm lint           # lint all packages
pnpm typecheck      # type-check all packages
pnpm db:generate    # generate Prisma client
pnpm db:push        # push schema to database
pnpm db:migrate     # run migrations
pnpm db:studio      # open Prisma Studio
```

## Auth Providers

Supported out of the box (configure via environment variables):

| Provider | Env vars needed |
|---|---|
| Local (email/password) | — |
| GitHub | `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` |
| Google | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` |
| GitLab | `AUTH_GITLAB_ID`, `AUTH_GITLAB_SECRET` |
| Discord | `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET` |
| Facebook | `AUTH_FACEBOOK_ID`, `AUTH_FACEBOOK_SECRET` |
| Slack | `AUTH_SLACK_ID`, `AUTH_SLACK_SECRET` |
| Twitch | `AUTH_TWITCH_ID`, `AUTH_TWITCH_SECRET` |
| Microsoft | `AUTH_MICROSOFT_ENTRA_ID`, `AUTH_MICROSOFT_ENTRA_SECRET`, `AUTH_MICROSOFT_ENTRA_TENANT_ID` |
| Auth0 | `AUTH_AUTH0_ID`, `AUTH_AUTH0_SECRET`, `AUTH_AUTH0_ISSUER` |
| Okta | `AUTH_OKTA_ID`, `AUTH_OKTA_SECRET`, `AUTH_OKTA_ISSUER` |

## License

MIT
