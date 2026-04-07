import { PrismaClient } from '@prisma/client'
import { createHash, randomBytes } from 'crypto'

const prisma = new PrismaClient()

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = createHash('sha256')
    .update(password + salt)
    .digest('hex')
  return `${salt}:${hash}`
}

async function main() {
  console.log('Seeding database...')

  // Default groups
  const adminGroup = await prisma.group.upsert({
    where: { id: 'group-administrators' },
    update: {},
    create: {
      id: 'group-administrators',
      name: 'Administrators',
      permissions: {
        'manage:system': true,
        'manage:users': true,
        'manage:groups': true,
        'manage:navigation': true,
        'manage:pages': true,
        'manage:assets': true,
        'read:pages': true,
        'write:pages': true,
        'delete:pages': true,
      },
    },
  })

  await prisma.group.upsert({
    where: { id: 'group-guests' },
    update: {},
    create: {
      id: 'group-guests',
      name: 'Guests',
      permissions: {
        'read:pages': true,
      },
    },
  })

  await prisma.group.upsert({
    where: { id: 'group-editors' },
    update: {},
    create: {
      id: 'group-editors',
      name: 'Editors',
      permissions: {
        'read:pages': true,
        'write:pages': true,
        'manage:assets': true,
      },
    },
  })

  console.log('Created default groups')

  // Default admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@court-wiki.local' },
    update: {},
    create: {
      email: 'admin@court-wiki.local',
      name: 'Administrator',
      passwordHash: hashPassword('changeme'),
      isAdmin: true,
      isActive: true,
    },
  })

  // Add admin to administrators group
  await prisma.groupUser.upsert({
    where: { userId_groupId: { userId: adminUser.id, groupId: adminGroup.id } },
    update: {},
    create: { userId: adminUser.id, groupId: adminGroup.id },
  })

  console.log(`Created admin user: admin@court-wiki.local (password: changeme)`)

  // Getting started page
  await prisma.page.upsert({
    where: { path: 'getting-started' },
    update: {},
    create: {
      path: 'getting-started',
      title: 'Getting Started',
      description: 'Welcome to Court Wiki — your team knowledge base.',
      content: `# Getting Started

Welcome to **Court Wiki** — a modern, self-hosted wiki for your team.

## Creating Pages

Click **New Page** in the top navigation to create your first page. Pages support Markdown with:

- **Tables**, task lists, and footnotes
- **Code blocks** with syntax highlighting
- **Math** via KaTeX (\`$E = mc^2$\`)
- **Diagrams** via Mermaid

## Navigation

Use the sidebar to browse pages, or use the search bar to find content instantly.

## Admin Panel

Visit [/admin](/admin) to manage users, groups, permissions, and site settings.

> **Default credentials**: \`admin@court-wiki.local\` / \`changeme\`
> Change your password immediately after first login.
`,
      contentType: 'MARKDOWN',
      locale: 'en',
      isPublished: true,
      isPrivate: false,
      authorId: adminUser.id,
    },
  })

  console.log('Created Getting Started page')

  // Architecture reference page
  await prisma.page.upsert({
    where: { path: 'docs/architecture' },
    update: {},
    create: {
      path: 'docs/architecture',
      title: 'Architecture',
      description: 'System overview, tech stack, and monorepo structure.',
      content: `# Architecture

Court Wiki is a self-hosted, collaborative knowledge base built as a **Next.js monorepo**.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS |
| API | tRPC v11 — end-to-end type-safe RPC |
| Auth | Auth.js (NextAuth v5) — JWT sessions, OAuth + credentials |
| Database | PostgreSQL via **Prisma ORM** |
| Search | PostgreSQL full-text (default) or Typesense |
| Storage | Local filesystem or S3-compatible (Cloudflare R2, Minio, AWS) |
| Rendering | remark / rehype pipeline — Markdown, AsciiDoc, raw HTML |
| Deployment | Vercel (web), any Node.js host (worker) |

## Monorepo Layout

\`\`\`
court-wiki/
├── apps/
│   ├── web/          # Next.js application (UI + API routes + middleware)
│   └── worker/       # Background job processor (page indexing, cleanup)
├── packages/
│   ├── auth/         # NextAuth config, providers, JWT/session callbacks
│   ├── core/         # Shared types and enums (ContentType, etc.)
│   ├── db/           # Prisma schema, client singleton, seed
│   ├── rendering/    # Markdown → HTML pipeline (remark + rehype)
│   ├── search/       # Search provider abstraction (postgres / typesense)
│   └── storage/      # Storage provider abstraction (local / s3)
└── turbo.json        # Turborepo pipeline config
\`\`\`

## Request Lifecycle

1. **Browser** makes a request.
2. **Edge Middleware** (\`apps/web/middleware.ts\`) runs the Auth.js \`authorized\` callback to check session and redirect unauthenticated users.
3. **Next.js App Router** renders Server Components or delegates to a Route Handler.
4. **tRPC Route Handler** (\`/api/trpc/[trpc]\`) processes API calls, builds a tRPC context (with Prisma + session), and dispatches to the appropriate router.
5. **Prisma** executes queries against PostgreSQL.
6. The response is streamed back to the client.

## Authentication Flow

\`\`\`
User clicks "Sign in with GitHub"
  → POST /api/auth/signin/github
  → GitHub OAuth consent screen
  → GET  /api/auth/callback/github  (GitHub redirects back)
  → Auth.js PrismaAdapter: creates/links User + Account rows in DB
  → JWT cookie set (signed with AUTH_SECRET)
  → Redirect to callbackUrl (or /)
\`\`\`

Sessions are **JWT-based** (no server-side session store needed), with user metadata (\`id\`, \`isAdmin\`) embedded in the token via the \`jwt\` callback.

## Database Schema

Key models and their relationships:

- **User** — core identity; holds email, passwordHash, isAdmin, locale
- **Account** — OAuth account links (GitHub, Google, etc.) per Auth.js spec
- **Page** — wiki content (path unique, contentType, isPublished, isPrivate)
- **PageVersion** — version history for every edit
- **Tag / PageTag** — many-to-many tagging
- **Asset / AssetFolder** — uploaded file management
- **Group / GroupUser** — permission groups
- **SearchIndex** — full-text index row per page (postgres provider)

## Environment Variables

| Variable | Purpose |
|---|---|
| \`DATABASE_URL\` | PostgreSQL connection string |
| \`AUTH_SECRET\` | JWT signing secret (required in production) |
| \`AUTH_URL\` | Canonical public URL of the deployment |
| \`GITHUB_CLIENT_ID\` / \`GITHUB_CLIENT_SECRET\` | GitHub OAuth (or \`AUTH_GITHUB_*\`) |
| \`STORAGE_PROVIDER\` | \`local\` (default) or \`s3\` |
| \`SEARCH_PROVIDER\` | \`postgres\` (default) or \`typesense\` |
`,
      contentType: 'MARKDOWN',
      locale: 'en',
      isPublished: true,
      isPrivate: false,
      authorId: adminUser.id,
    },
  })

  console.log('Created Architecture page')

  // API reference page
  await prisma.page.upsert({
    where: { path: 'docs/api' },
    update: {},
    create: {
      path: 'docs/api',
      title: 'API Reference',
      description: 'tRPC routers, auth endpoints, and how to call the API.',
      content: `# API Reference

Court Wiki exposes its API exclusively through **tRPC**, available at \`/api/trpc\`.
All procedures are fully type-safe and consumed via the \`trpc\` client in the frontend.

## Base URL

\`\`\`
https://<your-domain>/api/trpc
\`\`\`

## Authentication

API calls inherit the caller's session cookie automatically when made from the browser.
Server Components use a direct in-process caller (no HTTP overhead).

There are three procedure types:

| Type | Description |
|---|---|
| \`publicProcedure\` | Anyone can call — no session required |
| \`protectedProcedure\` | Requires a valid signed-in session |
| \`adminProcedure\` | Requires \`isAdmin: true\` on the session user |

---

## pages

### \`pages.list\` — public

Returns a paginated list of pages.

**Input**
\`\`\`ts
{
  page?: number        // default 1
  perPage?: number     // default 20, max 100
  locale?: string
  isPublished?: boolean
  tag?: string
  search?: string
}
\`\`\`

Unauthenticated callers automatically see only published, non-private pages.

---

### \`pages.get\` — public

Fetch a single page by its path.

**Input**
\`\`\`ts
{ path: string; locale?: string }
\`\`\`

Returns \`NOT_FOUND\` for missing, unpublished (unless owner/admin), or private (unless signed in) pages.

---

### \`pages.create\` — protected

Create a new page.

**Input**
\`\`\`ts
{
  path: string         // lowercase, /[a-z0-9/_-]+/
  title: string
  description?: string
  content: string
  contentType?: "MARKDOWN" | "ASCIIDOC" | "HTML"
  locale?: string
  isPublished?: boolean
  isPrivate?: boolean
  tags?: string[]
}
\`\`\`

---

### \`pages.update\` — protected

Update an existing page. Accepts any subset of the create fields plus \`id\`.

---

### \`pages.delete\` — protected

Delete a page by ID. Only the author or an admin can delete.

---

## search

### \`search.query\` — public

Full-text search across published pages.

**Input**
\`\`\`ts
{
  q: string            // min 1, max 500 chars
  locale?: string
  limit?: number       // default 20, max 50
  offset?: number
  tags?: string[]
}
\`\`\`

---

### \`search.suggest\` — public

Lightweight autocomplete suggestions (title + path prefix match).

**Input**
\`\`\`ts
{ q: string; locale?: string; limit?: number }
\`\`\`

---

## users

### \`users.me\` — protected

Returns the current user's profile including groups.

---

### \`users.updateProfile\` — protected

Update name, avatar URL, locale, or timezone for the current user.

---

### \`users.changePassword\` — protected

Change the current user's password (credentials accounts only).

---

### \`users.list\` — admin

Paginated list of all users with optional search filter.

---

### \`users.create\` — admin

Create a new user account (optionally with a password).

---

### \`users.update\` — admin

Update any user's name, isAdmin, isActive, locale, or timezone.

---

### \`users.register\` — public

Self-registration endpoint (email + name + password). Always available unless you add a feature flag.

---

## assets

### \`assets.list\` — protected

List assets in a folder (paginated). Pass \`folderId\` to browse a subfolder; omit for root.

---

### \`assets.upload\` — protected

Upload a new file. Returns the stored asset record including the public \`url\`.

---

### \`assets.delete\` — protected

Delete an asset by ID. Only the uploader or an admin can delete.

---

## admin

### \`admin.stats\` — admin

Returns total counts (pages, users, assets, groups) and the 5 most recent pages and users.

---

### \`admin.listGroups\` / \`admin.createGroup\` / \`admin.updateGroup\` / \`admin.deleteGroup\` — admin

Full CRUD for permission groups.

---

## Auth endpoints (NextAuth)

These are standard Auth.js REST endpoints served by \`/api/auth/[...nextauth]\`:

| Endpoint | Description |
|---|---|
| \`GET /api/auth/providers\` | List configured OAuth providers |
| \`GET /api/auth/session\` | Current session data (used by \`SessionProvider\`) |
| \`GET /api/auth/csrf\` | CSRF token for form-based sign-in |
| \`POST /api/auth/signin/:provider\` | Initiate sign-in for a provider |
| \`GET /api/auth/callback/:provider\` | OAuth callback handler |
| \`POST /api/auth/signout\` | Sign out and clear session cookie |
`,
      contentType: 'MARKDOWN',
      locale: 'en',
      isPublished: true,
      isPrivate: false,
      authorId: adminUser.id,
    },
  })

  console.log('Created API Reference page')
  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
