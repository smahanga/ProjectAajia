# Project Specification

## Vision

Build a Google Docs-style collaborative document product, end-to-end. Intentionally scoped: we build one feature area at a time, going deep rather than wide. Future phases (in rough order of priority) will likely include:

- Real-time collaborative editing (CRDTs or OT)
- Version history
- Comments and suggestions
- Sharing and permissions
- Export (PDF, .docx)
- Search

None of those are being built right now. We are on phase 1.

---

## Phase 1: Document Creation and Editing

### User stories (in scope)

- As a user, I can see a list of my documents.
- As a user, I can create a new document and land directly in the editor.
- As a user, I can rename a document by editing its title inline.
- As a user, I can type into the document and apply formatting: **bold**, *italic*, underline, headings (H1/H2/H3), bulleted list, numbered list.
- As a user, I can leave and return to a document and my content is preserved.
- As a user, my changes are saved automatically while I work (no Save button).

### Explicitly out of scope for phase 1

- Sharing or multiple users on the same doc
- Real-time collaboration
- Comments, suggestions, or any annotation
- Version history or undo across sessions (in-session undo is free from the editor)
- Exports of any kind
- Folders, tags, or organization
- Full-text search
- Real authentication (a placeholder user ID is fine)
- Image/file/embed insertion
- Tables, code blocks, blockquotes (we may add these in a phase 1.5)
- Mobile-specific UI work (responsive is fine, mobile-first isn't required)

### Architecture decisions

**Editor: TipTap (on ProseMirror).** ProseMirror is a real document model with a schema, not a wrapper around `contentEditable`. This is what Google Docs and Notion-class editors are built on. The alternative (Slate, Lexical, raw `contentEditable`) either has more rough edges or less battle-testing for the features we'll need later.

**Storage format: ProseMirror JSON.** TipTap's `editor.getJSON()` output. Stored in Postgres as a `JSONB` column. Critically, do not store HTML — HTML loses structural information we'll need for diffing (version history) and operational transforms (collaboration).

**Document shape (shared type):**
```ts
type Document = {
  id: string;            // UUID v4
  title: string;
  content: ProseMirrorJSON; // editor.getJSON() output
  createdAt: string;     // ISO 8601
  updatedAt: string;     // ISO 8601
  ownerId: string;       // placeholder for now
};
```

**Auto-save: debounced PATCH on change.** Debounce ~800–1000ms. On every successful save, update an "All changes saved" / "Saving…" indicator. Don't block typing on saves. Handle failed saves with a retry and a visible warning if it keeps failing.

**API surface:**
- `GET /api/documents` — list (id, title, updatedAt only — don't send full content)
- `POST /api/documents` — create, returns new document with empty content
- `GET /api/documents/:id` — fetch one (full content)
- `PATCH /api/documents/:id` — partial update (title and/or content)
- `DELETE /api/documents/:id` — added in phase 1.5; 204 on success, 404 if missing or unowned

**Database schema (Postgres):**
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content JSONB NOT NULL DEFAULT '{"type":"doc","content":[]}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX documents_owner_updated_idx
  ON documents (owner_id, updated_at DESC);
```

### Dependencies (approved for phase 1)

Frontend:
- `react`, `react-dom`
- `react-router-dom` (for `/documents` and `/documents/:id` routes)
- `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-underline`
- `vite`, `typescript`

Backend:
- `express`
- `pg` (node-postgres) — raw SQL is fine for now; defer ORM until we feel the pain
- `zod` (request validation)
- `uuid`
- `cors`
- `typescript`, `tsx` (dev runner), `@types/*`

Anything beyond this list: ask first.

### Open questions (need user input before scaffolding)

1. **Auth for phase 1.** Options:
   - Skip entirely: single hardcoded user, no login screen
   - Placeholder: hardcoded `ownerId` in a config file, designed to be swapped later
   - Real auth now (email/password)

2. **How to run it.** Options:
   - Bare local dev (Postgres installed locally, two terminals for web/api)
   - Docker Compose (Postgres + api + web)
   - Just code, user handles environment

### Build order (proposed)

1. Monorepo skeleton: `apps/web`, `apps/api`, `packages/shared`, root `package.json` with workspaces.
2. Shared `Document` type in `packages/shared`.
3. Backend: Postgres connection, migrations, the five endpoints above, with zod validation.
4. Frontend: routing shell + document list page (with placeholder data first, then wired to API).
5. Frontend: editor page with TipTap, full formatting toolbar.
6. Frontend: inline title editing.
7. Frontend: auto-save with debounce + save indicator.
8. End-to-end smoke test: create, edit, navigate away, return, content is there.

Each step should leave the project runnable.

---

## Phase 1.5: closing known gaps (2026-05-20)

A small, scoped follow-up to phase 1 that closed three specific gaps while the codebase was still fresh. Phase 1.5 was not feature work — it was paying down known risk before phase 2.

**What was added:**

1. **`beforeunload` flush for auto-save.** `useAutoSave` now exposes a `flush()` method that cancels the pending debounce and fires the patch with `fetch` `keepalive: true`. `EditorPage` registers a `beforeunload` listener that calls it. Closes the previous 800ms tab-close window. (Note: internal SPA navigation still doesn't fire `beforeunload`, so the back-link case still drops the in-flight window — accepted trade-off.)
2. **`DELETE /api/documents/:id` endpoint and list-page delete UI.** Backend uses the same `withOwner` middleware; returns 204 on success, 404 if missing or unowned. Frontend uses `window.confirm` (no custom modal), optimistically removes the row on confirm, and restores it with an inline error on API failure. Editor renders a "Document not found" state when navigating to a deleted doc's URL.
3. **Minimal test scaffolding.** Vitest in both workspaces. API tests use supertest against `createApp()` with a separate `aajia_test` database (created and migrated automatically on first run, truncated between cases). Web tests use jsdom + React Testing Library. Root `npm test` runs both. Coverage: one integration file covering all five endpoints plus owner-scoping negative test; one hook test covering debounce-collapsing, retry-with-backoff, freshness during retry, and unmount cancellation.

**What 1.5 explicitly did not include** (still phase 2 or beyond): test coverage thresholds, CI config, Playwright/E2E, snapshot tests, custom modals, an auth system.

---

### Out-of-scope creep watch

If you find yourself wanting to add any of the following during phase 1, stop and confirm first:

- A "share" button, even a non-functional one
- WebSocket setup of any kind
- A `revisions` or `history` table
- A `comments` table
- User signup/login UI beyond a placeholder
- Cloud deployment configs (Vercel, Fly, etc.)
- Tailwind, shadcn/ui, or a CSS framework — phase 1 can ship with hand-written CSS or CSS modules. Add a framework only when styling complexity actually demands it.
