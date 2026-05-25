# Agent notes — Event Management (DB course project)

## Project

PostgreSQL event-management schema for a **Database Fundamentals** course: organizers, venues, events, ticket types, bookings, payments, check-ins. Business rules and enums live in **`docs/specification.md`**. **Do not** change schema or seed without updating the spec first when behavior changes.

## Repo map

| Area | Location |
|------|-----------|
| Authoritative spec | `docs/specification.md` |
| Project overview / rubric checklist | `README.md` |
| DBML + ERD source | `schema/schema.dbml` (import at dbdiagram.io) |
| DDL + seed | `schema/01_ddl.sql`, `schema/02_seed.sql` — see `schema/README.md` |
| Course analytics SQL | `queries/*.sql` |

## Stack (if building MVP)

Postgres + optional **FastAPI** + **React** per README. Env / connection string should not be committed.

## Conventions

- **SQL:** PostgreSQL; FKs use `ON DELETE CASCADE` per spec §9.
- **Status strings:** Exact values in spec §5.3 (`pending` / `ongoing` / `done`, etc.).
- **Naming:** Match existing files (`snake_case` tables/columns in SQL).

## Documentation when you change something

When a change **materially** affects behavior, grading artifacts, or how to run the project:

1. Update **`docs/specification.md`** if rules or the data model shift.
2. Add or adjust a short note in **`README.md`** or **`schema/README.md`** if run instructions or deliverables change.
3. For significant milestones only, a brief **`docs/changelog.md`** entry (date + one line) is enough — **do not** create random extra `.md` files for tiny edits.

If the change is cosmetic (typos, formatting) or purely internal refactors with no spec impact, extra docs are optional.

## Git branches (slice workflow) — required for agents

This repo uses **partial branches** (`db_schema`, `backend`, `frontend`, `docs`) that intentionally omit most of `main`. **`main`** is the full integration branch (deploy from here).

### Do not

- **`git merge main`** (or merge `main` via GitHub UI) **into** `db_schema`, `backend`, `frontend`, or `docs` — that causes modify/delete conflicts on `README.md`, `.gitignore`, and folders removed on slice branches.
- **`git push origin main` alone** after doc/code changes — slice branches on GitHub will drift and teammates get conflicts on the next merge attempt.
- Push only one slice branch while leaving `main` and the other slices stale, unless the user explicitly asked for a single-branch push.

### Do

1. Land integration work on **`main`** (commit locally or on `main`).
2. From a **clean** `main` working tree, run:
   ```bash
   ./scripts/sync_branches_from_main.sh
   ```
   (copies paths from `main` with `git checkout main -- …`; does **not** merge).
3. Push **all** updated branches together:
   ```bash
   git push origin main db_schema backend frontend docs
   ```

One-off sync: `./scripts/sync_branches_from_main.sh db_schema` (or `backend`, `frontend`, `docs`).

If a merge is already in progress on a slice branch: `git merge --abort`, then sync from `main` as above (or `git reset --hard origin/<branch>` and re-run the sync script).

**Agent default:** do not `git push` unless the user asked. If the user asked to push, sync slice branches from `main` first, then push `main` and every slice branch that changed in the same session.

## What to avoid

- Drive-by refactors outside the requested scope.
- New features (refunds, multi-currency, etc.) that contradict the spec.
- Committing secrets (`.env`, real DB passwords).
