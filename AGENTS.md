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

This repo uses **partial branches** (`db_schema`, `backend`, `frontend`, `docs`) that intentionally omit most of `main`. **`main`** is the full integration branch (deploy from here). Slice branches are **mirrors** synced from `main`; they are **not** merged back via GitHub PRs.

### Do not

- **`git merge main`** (or GitHub “Update branch”) **on** slice branches — modify/delete conflicts.
- **`git push origin main` alone** after shared changes — run the sync script and push slices too.
- **Open or rely on PRs `db_schema` / `backend` / `frontend` / `docs` → `main`** — they cannot auto-merge (slice tip deletes folders that exist on `main`). Close those PRs; integrate on `main` only.
- Push slice branches without **`--force-with-lease`** after `./scripts/sync_branches_from_main.sh` (the script resets slice history onto `main`).

### Do

1. Land integration work on **`main`** (feature PRs target **`main`**, not a slice branch).
2. From a **clean** `main` working tree:
   ```bash
   ./scripts/sync_branches_from_main.sh
   git push origin main
   git push --force-with-lease origin db_schema backend frontend docs
   ```
3. Tell the user to **close** stale slice→`main` PRs on GitHub if conflicts persist (sync does not repair PR metadata).

**Agent default:** do not `git push` unless the user asked. If pushing: sync slices first, then push `main` and all slice branches (`--force-with-lease` on slices).

## What to avoid

- Drive-by refactors outside the requested scope.
- New features (refunds, multi-currency, etc.) that contradict the spec.
- Committing secrets (`.env`, real DB passwords).
