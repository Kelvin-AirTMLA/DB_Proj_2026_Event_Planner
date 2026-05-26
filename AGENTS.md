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

Teammates **work on slice branches** (`db_schema`, `backend`, `frontend`, `docs`) to stay organized. **`main`** is the full integration branch (deploy from here). Changes on a slice must reach `main` via **`integrate_slice_to_main.sh`** (path copy), not `git merge` or a slice→`main` GitHub PR.

### Do not

- **`git merge`** between `main` and slice branches (either direction) — use the two scripts below.
- **Merge GitHub PRs** `db_schema` / `backend` / `frontend` / `docs` → `main` — use integrate script instead.
- **`git push origin main` alone** after a slice was updated — integrate (if needed), then `sync_branches_from_main.sh`, then push all branches.
- Push slice branches without **`--force-with-lease`** after sync (slice history is reset onto `main`).

### Do

**Work landed on a slice branch** (e.g. user edited `docs`):

```bash
git checkout main
./scripts/integrate_slice_to_main.sh docs    # or db_schema, backend, frontend
./scripts/sync_branches_from_main.sh
git push origin main
git push --force-with-lease origin db_schema backend frontend docs
```

**Work landed directly on `main`:** skip integrate; run only `sync_branches_from_main.sh` and push as above.

**Agent default:** do not `git push` unless the user asked. If pushing after slice work: **integrate → sync → push `main` + all slices**.

## What to avoid

- Drive-by refactors outside the requested scope.
- New features (refunds, multi-currency, etc.) that contradict the spec.
- Committing secrets (`.env`, real DB passwords).
- **`Co-authored-by: Cursor`** (or any AI agent) in commit messages — GitHub may list the agent as a contributor; use the student’s git identity only.
- Leaving **merge conflict markers** (`<<<<<<<`, `=======`, `>>>>>>>`) in any committed file.
