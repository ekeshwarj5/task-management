# Task Management

A full-stack task management application — task CRUD with per-user isolation, filtering, search, sort, auth.

> Build in progress. Live links and full setup notes land before submission.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router) · TypeScript · Tailwind · shadcn/ui · TanStack Query |
| Backend | Node 20 · TypeScript (strict) · Fastify · Drizzle ORM · Zod |
| Database | PostgreSQL 16 |
| Auth | JWT in HTTP-only cookie · bcrypt |
| Tests | Vitest · `fastify.inject()` for integration |
| Local dev | Docker Compose (one-command boot) |
| CI | GitHub Actions: lint → typecheck → test on push |

## Project layout

```
task-management/
├── apps/
│   ├── api/                  # Fastify backend
│   └── web/                  # Next.js frontend
├── packages/
│   └── shared/               # Zod schemas + types shared by both
├── docker-compose.yml        # Postgres + (optionally) api + web
├── .github/workflows/        # CI
├── .env.example
└── README.md
```

## Setup notes

_To be completed when the build settles. Will cover: clone, env, `docker-compose up`, migrations, dev servers, tests._
