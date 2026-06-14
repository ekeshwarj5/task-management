# Task Management

Full-stack task management — task CRUD with per-user isolation, search, filter, sort, pagination, and auth. Built as the Full-Stack Developer take-home assignment.

> **Repo**: <https://github.com/ekeshwarj5/task-management>
>
> Deployed URLs will land here once the Vercel + Railway projects are live (see **Deployment** at the bottom).

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Next.js 16** (App Router) · TypeScript · Tailwind v4 · TanStack Query · react-hook-form · lucide-react | Required by the spec. App Router + Server Components are the modern path; TanStack Query handles the optimistic-UI bonus cleanly. |
| Backend | **Node 20** · TypeScript (strict) · **Fastify** · Zod | The spec says "Go preferred; you may choose another language based on your expertise." I chose Node/TS so I could ship the bonuses (optimistic UI, dark mode, CI, Docker) in the same time budget rather than pay the Go ramp-up. The reasoning is recorded in `docs/decisions.md`. |
| Database | **PostgreSQL 16** | Required by the spec. |
| ORM | **Drizzle ORM** + `drizzle-kit` migrations | Type-safe queries; generates plain SQL migrations that ship in `apps/api/src/db/migrations/`. |
| Auth | **JWT in HTTP-only, SameSite=Lax cookie** · bcrypt cost 10 | Cookie auth survives page refresh by default (the spec asks for this) and avoids the XSS surface of localStorage-bound tokens. |
| Tests | **Vitest** + `fastify.inject()` against a real Postgres container | 18 integration tests covering signup, login, CRUD, per-user isolation, filter / search / sort / pagination. |
| Local dev | **Docker Compose** | One command boots Postgres with a healthcheck. |
| CI | **GitHub Actions** | Typecheck across all workspaces, migrate, run the tests against a service-container Postgres, and build the frontend. Fails on any regression. |

## Project layout

```
task-management/
├── apps/
│   ├── api/                Fastify backend + Drizzle migrations + seed
│   └── web/                Next.js 16 frontend
├── packages/
│   └── shared/             Zod schemas + types — single source of truth
├── docker-compose.yml      Postgres 16 with a healthcheck
├── .github/workflows/      CI (typecheck → migrate → test → build)
├── .env.example            Every env var the api + web read
└── README.md
```

## Quick start

**Prerequisites**: Node 20+, Docker (or a local Postgres on `127.0.0.1:5433`).

```bash
# 1. Clone + install
git clone git@github.com:ekeshwarj5/task-management.git
cd task-management
npm install

# 2. Boot Postgres
docker compose up -d
# (Postgres listens on host port 5433; 5432 is often taken by an
#  existing install — see .env.example for the connection string.)

# 3. Create the test DB alongside the dev DB, then run migrations on both
docker exec task-postgres psql -U task -d task_management \
  -c "CREATE DATABASE task_management_test;"

DATABASE_URL=postgres://task:task@127.0.0.1:5433/task_management \
JWT_SECRET=local-secret-thirty-two-characters-long-x \
  npx tsx apps/api/src/db/migrate.ts

DATABASE_URL=postgres://task:task@127.0.0.1:5433/task_management_test \
JWT_SECRET=local-secret-thirty-two-characters-long-x \
  npx tsx apps/api/src/db/migrate.ts

# 4. Run the API and the web app in two terminals
# — terminal 1
cd apps/api
DATABASE_URL=postgres://task:task@127.0.0.1:5433/task_management \
JWT_SECRET=local-secret-thirty-two-characters-long-x \
  npm run dev          # http://localhost:3001

# — terminal 2
cd apps/web
NEXT_PUBLIC_API_URL=http://localhost:3001 npm run dev   # http://localhost:3000
```

Open <http://localhost:3000>, sign up, and start adding tasks.

## Configuration

All env vars are documented in [`.env.example`](.env.example). The ones the **API** reads:

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | _(required)_ | Postgres connection string. |
| `JWT_SECRET` | _(required, ≥32 chars)_ | Server fails to start if missing or too short. |
| `JWT_EXPIRES_IN` | `7d` | jsonwebtoken expiry string. |
| `COOKIE_NAME` | `task_session` | Auth cookie name. |
| `COOKIE_DOMAIN` | _(unset)_ | Set in production behind a real domain. |
| `COOKIE_SECURE` | `false` | **Set to `true` behind HTTPS in production.** |
| `CORS_ORIGIN` | `http://localhost:3000` | Frontend origin; must match for cookies to cross. |
| `API_PORT` | `3001` | Listen port. |
| `API_HOST` | `0.0.0.0` | Listen address. |
| `NODE_ENV` | `development` | |

The one the **frontend** reads:

| Variable | Default | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Where the browser will call. |

## Scripts

From the repo root:

| Command | What it does |
|---|---|
| `npm install` | Install all workspaces. |
| `npm run typecheck` | `tsc --noEmit` across `shared`, `api`, `web`. |
| `npm run build` | Build every workspace that has a `build` script. |

Per workspace:

| Command | What it does |
|---|---|
| `npm run dev --workspace=@task/api` | Fastify with `tsx watch` on `:3001`. |
| `npm run dev --workspace=@task/web` | Next.js dev server on `:3000`. |
| `npm run test --workspace=@task/api` | Vitest integration suite (needs a running Postgres). |
| `npm run db:generate --workspace=@task/api` | Regenerate migration files from `schema.ts`. |
| `npm run db:migrate --workspace=@task/api` | Apply pending migrations against `DATABASE_URL`. |
| `npm run build --workspace=@task/web` | Production Next.js build. |

## Tests

18 integration tests via Vitest + `fastify.inject()`:

| File | Coverage |
|---|---|
| `auth.test.ts` (5) | Signup → `/auth/me` round-trip; duplicate signup 409; login email-enumeration check; short-password 400; anonymous `/auth/me` 401. |
| `tasks-crud.test.ts` (5) | POST → GET → PATCH → DELETE lifecycle; missing-cookie 401; empty title 400; empty PATCH body 400; non-existent id 404. |
| `tasks-isolation.test.ts` (2) | Cross-user reads / updates / deletes all 404 (no existence leak); list only returns the caller's tasks. |
| `tasks-list.test.ts` (6) | Status filter, case-insensitive ILIKE search, sort by priority desc, sort by dueDate asc with nulls last, pagination across 7 rows, pageSize ceiling 100. |

```bash
# One-time: create the test DB + run migrations (see Quick start step 3)
# Then:
cd apps/api
DATABASE_URL=postgres://task:task@127.0.0.1:5433/task_management_test \
JWT_SECRET=local-secret-thirty-two-characters-long-x \
  npx vitest run
```

## API surface

All `/tasks` routes require a valid JWT cookie (issued by `/auth/login` or `/auth/signup`). The cookie is HTTP-only, so the browser handles auth transparently with `credentials: 'include'`.

| Verb | Path | Notes |
|---|---|---|
| `POST` | `/auth/signup` | Body `{ email, password }`. Returns `{ user }` and sets the session cookie. 409 on duplicate. |
| `POST` | `/auth/login` | Same body. Returns `{ user }` and sets the cookie. Generic 401 for wrong email *or* password (no enumeration). |
| `POST` | `/auth/logout` | Clears the cookie. 204. |
| `GET` | `/auth/me` | Returns the decoded `{ user }` if the cookie is valid. 401 otherwise. The frontend uses this to hydrate auth state on page refresh. |
| `GET` | `/tasks` | Paginated list. Query: `page`, `pageSize` (≤100), `status`, `search` (ILIKE on title), `sortBy` (`createdAt` \| `dueDate` \| `priority`), `sortDir` (`asc` \| `desc`). |
| `POST` | `/tasks` | Body validated by `CreateTaskSchema`. Returns 201 + the new task. |
| `GET` | `/tasks/:id` | Returns the task or 404. Cross-user reads return 404 (no existence leak). |
| `PATCH` | `/tasks/:id` | Partial update via `UpdateTaskSchema`. Empty body returns 400. |
| `DELETE` | `/tasks/:id` | 204 on success, 404 otherwise. |

Error envelopes:

```jsonc
// Validation
{ "error": "ValidationError", "issues": [{ "path": ["title"], "message": "...", "code": "..." }] }

// Not found
{ "error": "NotFound", "message": "Task 00000000-... not found" }

// Unauthenticated
{ "error": "Unauthorized", "message": "Invalid or expired session" }

// Conflict (duplicate signup)
{ "error": "Conflict", "message": "Email is already registered" }
```

## Bonus features delivered

| Bonus from the spec | Status |
|---|---|
| **Dockerized setup** (`docker compose up` boots the dev DB) | ✓ |
| **CI pipeline** (GitHub Actions: typecheck, migrate, test, build on push) | ✓ |
| **Optimistic UI** on mark-complete + delete, with snapshot-based rollback on failure | ✓ |
| **Dark mode** (light / system / dark toggle, persisted in localStorage, no flash of unstyled content) | ✓ |
| Role-based admin access | Skipped — `user_role` enum is in the schema and the JWT carries `role`, but no admin-only routes wired. |
| Real-time updates (WebSocket / SSE) | Skipped (scope). |
| Task attachments | Skipped (scope). |
| Activity log | Skipped (scope). |

## Architecture + design notes

### Backend layering

```
routes/ ──▶ services/* (inline in this scope) ──▶ repositories/ ──▶ Drizzle ──▶ Postgres
            └── Zod from @task/shared validates inputs at the route boundary
```

Routes are thin: parse → validate → call repository → serialize → respond. Per-user isolation is enforced at the repository layer — every read/write filters by `userId`, so there's no path through the API to touch another user's row.

### Why per-user 404 (not 403) on cross-user lookups

A `403 Forbidden` on someone else's task ID would leak that the ID exists. Returning `404` for both "missing" and "wrong owner" keeps the existence of tasks per-user opaque. The tests pin this behaviour down (`tasks-isolation.test.ts`).

### Why diffing isn't needed on edit

`UpdateTaskSchema` is `.partial().strict().refine(non-empty)`. The frontend sends the full form payload (all fields filled), which is always a valid partial update — there's no risk of unchanged-`salary`-style schema rejection, because every editable field has either a value the user set or one we set as a default. So no diff computation needed.

### Why JWT in a cookie, not localStorage

The spec asks that "a page refresh keeps the user logged in." Both approaches satisfy that, but the cookie path:
- Is HTTP-only — out of reach of `document.cookie` and any XSS surface.
- Doesn't need a `useEffect` to read storage on every navigation; the browser attaches it for free with `credentials: 'include'`.
- Is the standard fit for `SameSite=Lax` CSRF guidance.

The trade-off is CORS: the frontend and backend must agree on origin + credentials; both are configured in `app.ts` (`@fastify/cors` `credentials: true`) and `lib/api.ts` (`credentials: 'include'`).

### Local Postgres on `:5433`

`5432` was already taken on my machine (an SSH tunnel was bound to it). I remapped to `:5433` to avoid conflicts; if `5432` is free on yours, change `POSTGRES_PORT` in `.env` to taste.

## Assumptions + trade-offs (one-pager for the reviewer)

- **Node/TS over Go.** The spec allowed both. Choosing Node/TS bought time to ship 4 of the bonus features instead of paying a stack-ramp tax. Recorded in this README.
- **Cookie-based auth.** Picked over header-bearer for the security and DX reasons above. Trade-off: configuration surface across CORS + cookie domain in production.
- **Drizzle, not Prisma.** Type-safe queries without a generated client step; migrations are plain SQL committed in-repo. Either would work.
- **Tests are integration, not unit.** Routes-through-DB tests catch SQL bugs and serialisation drift that pure-unit tests would miss. Each test runs in <50 ms against a real Postgres; the suite is 2 seconds end-to-end.
- **No mocking layer.** The repositories accept a `Db` instance; tests reuse the real one against a separate `task_management_test` DB with truncate-per-test.
- **`createdAt` is the default sort.** Users land on a most-recent-first view; that's also the path most heavily indexed.
- **Per-user 404 on cross-user IDs**, not 403 — to avoid existence leaks. Same pattern in `auth.test.ts` (generic 401 for both wrong email and wrong password).
- **No "delete account" flow.** Out of scope for the spec; the `tasks` FK uses `ON DELETE CASCADE` so it'd be a one-statement addition.
- **`pageSize` capped at 100.** Caller can't request the whole table in one call.

## Deployment

> The repo is ready for one-command deploys. Hosting accounts aren't connected yet — instructions below show the path the project is built for.

| Tier | Service | What you do |
|---|---|---|
| Frontend | **Vercel** | Connect this repo, set the root to `apps/web`, set `NEXT_PUBLIC_API_URL` to the API's URL. Deploy. |
| API | **Railway** (or **Render** / **Fly.io**) | Connect the repo, point at `apps/api`, set `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` to the Vercel URL, `COOKIE_SECURE=true`. Add a Postgres add-on and run `db:migrate` on first deploy. |
| Database | Railway PG / Neon / Supabase | Provision Postgres 16 alongside the API. Apply the migrations in `apps/api/src/db/migrations/`. |

When live, both URLs are added at the top of this README, and the submission email goes to `sabir@rival.io` with the repo link + deployed link.

## License

MIT.
