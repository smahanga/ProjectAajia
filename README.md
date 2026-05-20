# Project Aajia

A Google Docs-style document editor, built end-to-end in deliberate phases.

**Current phase:** document creation, editing, file upload, and sharing — see [`PROJECT_SPEC.md`](./PROJECT_SPEC.md) for scope.
For contributor / agent conventions, see [`AGENTS.md`](./AGENTS.md).
For editor-specific patterns, see [`.claude/skills/editor-patterns/SKILL.md`](./.claude/skills/editor-patterns/SKILL.md).

## Live demo

The app is served via a Cloudflare quick-tunnel to a locally running Docker stack — chosen over a PaaS deployment after time pressure and a Railway incident. The stack itself is identical to what would run in prod; only the hosting is local.

**Demo URL is short-lived** (the tunnel terminates when the host machine sleeps or the cloudflared process exits). Run locally for a reliable experience.

Two hardcoded users: **Alice** and **Bob** — switch between them via the dropdown in the top nav. The user identity is passed via the `x-user-id` header on every request; for this evaluation, the header is trusted (placeholder auth, designed as a single seam to swap for real auth in a later phase).

## Stack

- **Web:** React 18 + Vite + TipTap (ProseMirror)
- **API:** Node 20 + Express + raw SQL via `pg`
- **DB:** Postgres 16 (JSONB document content)
- **Storage format:** ProseMirror JSON — never HTML

## Layout

```
apps/
  api/        Express + Postgres backend (apps/api/src)
  web/        React + Vite + TipTap frontend (apps/web/src)
packages/
  shared/     Shared TypeScript types (Document, requests, responses)
```

## Prerequisites

- Docker Desktop (or any Docker engine + Compose v2)
- Node 20+ (only required if you want to run individual workspaces outside Docker)

## Run it

```bash
cp .env.example .env
docker compose up --build
```

This brings up three services:

| Service    | URL                       | Notes                                          |
| ---------- | ------------------------- | ---------------------------------------------- |
| `postgres` | `localhost:5432`          | Persistent volume (`pgdata`)                   |
| `migrate`  | one-shot                  | Runs SQL files in `apps/api/migrations/`, then exits |
| `api`      | `http://localhost:4000`   | Express, depends on `migrate` completing       |
| `web`      | `http://localhost:5173`   | Vite dev server                                |

Open `http://localhost:5173` and you should land on the document list.

## Common operations

```bash
# Stop everything
docker compose down

# Stop and wipe the database
docker compose down -v

# Re-run migrations only (e.g., after adding a new .sql file)
docker compose run --rm migrate

# Tail api logs
docker compose logs -f api
```

## File upload

The document list page has an "Upload" button that accepts a single `.md` or `.txt` file (max 1 MB) and creates a new document from its parsed content. The file's basename (without extension) becomes the document title; the original file is not stored. Markdown is converted to HTML via `marked`, then both `.md` and `.txt` go through the same HTML → ProseMirror JSON pipeline using the shared schema, so anything outside the schema (tables, links, etc.) is dropped on import while supported formatting (headings, **bold**, *italic*, lists) is preserved. `.docx` is not yet supported.

## Tests

```bash
# Run all tests (api + web)
npm test
```

Prerequisites for the api tests:

- Postgres must be reachable at `localhost:5432`. The easiest way is `docker compose up -d postgres`.
- The api test suite uses a separate database, `aajia_test`. The first run creates it automatically and applies migrations; subsequent runs reuse it.
- Each test `TRUNCATE`s the `documents` table, so test state doesn't leak across cases.

Web tests run standalone via jsdom — no Postgres needed.

For watch mode, run inside the respective workspace:

```bash
npm run test:watch --workspace @aajia/api
npm run test:watch --workspace @aajia/web
```

## API surface (phase 1)

| Method | Path                  | Notes                                          |
| ------ | --------------------- | ---------------------------------------------- |
| GET    | `/api/documents`      | List (id, title, updatedAt — content omitted)  |
| POST   | `/api/documents`      | Create empty doc, returns full doc             |
| GET    | `/api/documents/:id`  | Fetch one (full content)                       |
| PATCH  | `/api/documents/:id`  | Partial update — `{ title?, content? }`        |
| DELETE | `/api/documents/:id`  | Delete; 204 on success, 404 if missing/unowned |

All requests are stamped/filtered by `PLACEHOLDER_USER_ID` (env var). This is the single seam to swap for real auth in a later phase.

## Phase 1 acceptance

- Land on `/documents`, see the list
- Click "New document" → arrive in the editor on a new empty doc
- Type with formatting (bold, italic, underline, H1/H2/H3, bullet/numbered lists)
- Edit the title inline
- Navigate away and back — title + content are preserved
- "All changes saved" indicator updates as you type

## What's intentionally not here (phase 1)

Sharing, real-time collaboration, comments, version history, exports, folders, search, real auth, image uploads, tables, blockquotes, code blocks, DELETE endpoint. See `PROJECT_SPEC.md` for the full out-of-scope list.

## Troubleshooting

- **Port already in use:** something else is on `5432`, `4000`, or `5173`. Edit `.env` to change `API_PORT` / `WEB_PORT`, or stop the conflicting process.
- **Web can't reach api:** confirm `VITE_API_URL` in `.env` matches your host (default `http://localhost:4000`). The browser hits the api directly, not through Docker.
- **Schema looks empty:** run `docker compose run --rm migrate` to re-apply migrations. Check `apps/api/migrations/` for the SQL files.
- **Bare-metal Postgres:** if you want to skip Docker and run Postgres locally, change `DATABASE_URL` in `.env` to `postgres://aajia:aajia@localhost:5432/aajia` and run the api/web workspaces via `npm run dev:api` / `npm run dev:web` from the repo root.
