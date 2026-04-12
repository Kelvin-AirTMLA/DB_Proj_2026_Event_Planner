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

## What to avoid

- Drive-by refactors outside the requested scope.
- New features (refunds, multi-currency, etc.) that contradict the spec.
- Committing secrets (`.env`, real DB passwords).
