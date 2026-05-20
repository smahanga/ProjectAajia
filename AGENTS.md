# AGENTS.md

This file gives any AI coding agent working in this repo the persistent context it needs. Read this before touching code.

## Project

A Google Docs-style web app, built end-to-end in deliberate phases. We are intentionally scoping narrowly: depth over breadth, one feature area at a time.

**Current phase:** Document Creation and Editing (see `PROJECT_SPEC.md`).

## Working principles

1. **Scope discipline.** If something belongs to a later phase (collaboration, comments, version history, sharing, auth-beyond-placeholder, exports, folders, search), do not build it now. If you think the current phase needs it, say so explicitly and wait for confirmation.

2. **Ask before scaffolding.** Before generating more than ~50 lines of code or adding any dependency not listed in `PROJECT_SPEC.md`, propose the plan.

3. **Architectural decisions are sticky.** The stack and storage format are decided (see `PROJECT_SPEC.md`). Don't quietly substitute alternatives. If you see a real problem with a decision, raise it as a question, not as a code change.

4. **Storage format is load-bearing.** Documents are stored as ProseMirror/TipTap JSON, not HTML. Everything downstream (version diffing, collaboration, comments) depends on this. Never serialize editor state to HTML for storage.

5. **Small, reviewable changes.** Prefer multiple focused commits over one sweeping change. Each commit should leave the project in a runnable state.

6. **Summarize at milestones.** When a feature or sub-feature is complete, produce a short summary I can paste into a separate planning conversation: what changed, what files were touched, what's still open.

## Tech stack (decided)

- **Frontend:** React 18 + Vite, TipTap editor (built on ProseMirror)
- **Backend:** Node.js + Express, PostgreSQL
- **Language:** TypeScript on both sides
- **Package manager:** npm (use whichever the user prefers — confirm if unsure)

## Repository layout (target)

```
/
├── AGENTS.md                  (this file)
├── PROJECT_SPEC.md            (phase scope + decisions)
├── KICKOFF_PROMPT.md          (initial handoff prompt, can be deleted after kickoff)
├── .claude/
│   └── skills/
│       └── editor-patterns/
│           └── SKILL.md       (editor-specific guidance)
├── apps/
│   ├── web/                   (React frontend)
│   └── api/                   (Express backend)
└── packages/
    └── shared/                (shared types: Document, etc.)
```

Use a monorepo (npm workspaces) so frontend and backend can share TypeScript types for the document shape.

## Conventions

- TypeScript strict mode on.
- No `any` without a comment explaining why.
- Frontend state: React hooks only for this phase. No Redux/Zustand/etc. unless we hit a concrete need.
- Backend: thin Express routes that call into a service layer. Don't put DB queries directly in route handlers.
- Errors: return real HTTP status codes; don't return `200 { error: "..." }`.
- IDs: use UUIDs (v4) generated server-side. Don't expose database integer PKs.
- Timestamps: store as `TIMESTAMPTZ` in Postgres, transmit as ISO 8601 strings.

## What "done" looks like for the current phase

A user can:
- Land on a document list, see their documents
- Click "New document" → arrives in the editor with an empty doc and an editable title
- Type content with formatting (bold, italic, underline, H1/H2/H3, bulleted list, numbered list)
- Edit the title inline
- Navigate away and come back — everything is still there (auto-saved)

That's it. No sharing button. No comments. No history. No exports.

## Communication style

- Be direct. Surface trade-offs, don't paper over them.
- When proposing a plan, list concrete file paths and what each file will contain.
- When a decision is ambiguous, present options with trade-offs, then ask.
