# Design Decisions

Short, dated records of the engineering choices behind this codebase. Each entry: what we picked, what we rejected, why.

---

## D1 — Backend in Node/TS, not Go

**Decision**: Build the API in Node 20 + TypeScript + Fastify.

**Context**: The spec says *"Go preferred; you may choose another language based on your expertise."*

**Trade-off**:
- Go would tick the "preferred" tag, plus a stretch signal.
- Node/TS is something I ship in production daily — I can move faster, leaving room for the bonus features the spec also rewards (Docker, CI, dark mode, optimistic UI).

**Reasoning**: The spec also says *"We care more about how you make engineering decisions, define problems… than the number of features"*, but bonuses-shipped is still a visible signal. Choosing the stack I'm strongest in let me ship four of the listed bonuses in the same time-box. The TypeScript on both ends also lets the Zod schemas in `@task/shared` be the single source of truth for validation, which would have been impossible with a Go backend without duplicating the rules.

---

## D2 — Auth via JWT in HTTP-only cookie (not localStorage Bearer)

**Decision**: Issue a JWT inside an `HttpOnly`, `SameSite=Lax` cookie on signup/login, clear it on logout.

**Trade-off**:
| | Cookie | localStorage Bearer |
|---|---|---|
| Refresh persistence | Free (browser attaches on every request) | Requires `useEffect` to re-attach |
| XSS exposure | None for the token itself | Token is readable from any script |
| CORS / CSRF | Needs `credentials:'include'` + matching `CORS_ORIGIN` + `SameSite=Lax` | No CORS concerns; CSRF irrelevant |
| Cross-origin cross-site cookies | Works behind same-eTLD + HTTPS | N/A |

**Reasoning**: The spec calls out *"a page refresh should keep the user logged in"* — both satisfy it, but the cookie path is the security-conscious default. The CORS knob is a one-time configuration cost (`@fastify/cors` `credentials: true`, frontend `credentials: 'include'`); the XSS protection is permanent.

---

## D3 — Drizzle over Prisma

**Decision**: Drizzle ORM + `drizzle-kit` for migrations.

**Trade-off**:
- Prisma is more popular; its generated client is friendlier for newcomers.
- Drizzle is lighter (no codegen step), produces readable SQL, and its query API is closer to SQL itself.

**Reasoning**: For five tables and the queries we need (paginated list, single fetch, filtered count), Drizzle's "explicit SQL" surface is easier to reason about than Prisma's query DSL. Migrations are plain SQL files committed to git — diff-friendly. The choice would be defensible either way; I went with the one I trust to read 12 months from now.

---

## D4 — Per-user 404 on cross-user lookups, not 403

**Decision**: When user B requests a task owned by user A, return 404 (not 403).

**Trade-off**:
- 403 is semantically more accurate ("you can't see this").
- 404 hides the existence of the row from B entirely.

**Reasoning**: A 403 leaks the existence of the ID — a malicious caller could enumerate live IDs by watching for 403 vs 404. 404 for both "doesn't exist" and "exists but wrong owner" keeps that surface flat. Pinned by `tasks-isolation.test.ts`.

The same pattern shows up in `auth.test.ts`: login returns a generic 401 for both "wrong email" and "wrong password" so a caller can't enumerate registered emails.

---

## D5 — Integration tests, not unit

**Decision**: All 18 tests run against a real Postgres test database via `fastify.inject()`.

**Trade-off**:
- Pure unit tests (mocked repo) would run faster (~10 ms each instead of ~50 ms).
- Integration tests catch SQL drift, serialisation bugs, and validation regressions that unit tests miss.

**Reasoning**: The full suite still runs in ~2 seconds end-to-end. The cost is paying for a Postgres container, which we needed for `docker compose up` anyway. The benefit is each test exercises route → Zod → repo → Drizzle → SQL → response shape, end to end. Routes-through-DB tests have caught the dueDate-string-vs-timestamp serialisation bug during this build, which a mock would have missed.

For test isolation, each test starts with `TRUNCATE tasks, users RESTART IDENTITY CASCADE`. Vitest is set to `pool: 'forks', poolOptions.forks.singleFork: true` so file-level parallelism doesn't race on the shared pool.

---

## D6 — Skip activity log, real-time, attachments, admin

**Decision**: Of the eight listed bonus features, ship four (Docker, CI, optimistic UI, dark mode). Skip the rest.

**Reasoning**: The spec is explicit — *"We care more about how you make engineering decisions… than the number of features."* The four shipped are the ones with the best polish-per-hour ratio:
- **Docker** — bigger setup signal than its 20-line cost.
- **CI** — proves the test suite stays green.
- **Optimistic UI** — single most-visible UX upgrade over a baseline TanStack Query setup.
- **Dark mode** — small surface, but the no-flash-of-unstyled-content boot script demonstrates polish.

The skipped ones (activity log especially) are 2–4 hours each and don't change the assessment story. The schema does already include a `user_role` enum and the JWT carries `role`, so an admin-tier list endpoint would be a thin layer if scope allowed.

---

## D7 — Postgres listens on `:5433`, not `:5432`, in dev

**Decision**: `docker-compose.yml` maps the container's `5432` to host `5433` (configurable via `POSTGRES_PORT`).

**Reasoning**: `5432` was occupied on my dev machine by an existing SSH tunnel. Rather than fight the conflict, the compose mapping defaults to a non-default port. The .env.example and README call it out, and CI uses `5432` (no conflict in the GitHub Actions runner).
