# Database schema (PostgreSQL)

This folder holds the **logical model**, **DDL**, and **seed data** for the Event Management App. The authoritative business rules live in `[../docs/specification.md](../docs/specification.md)`.

## Files


| File              | Purpose                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| `**schema.dbml`** | [DBML](https://dbml.dbdiagram.io/) for [dbdiagram.io](https://dbdiagram.io): ERD, export to PNG/PDF/SQL. |
| `**01_ddl.sql**`  | `CREATE TABLE`, foreign keys (`ON DELETE CASCADE`), `CHECK` constraints, indexes.                        |
| `**02_seed.sql**` | `INSERT` sample data (counts and statuses match the spec).                                               |
| `**ERD.png**`     | Exported diagram for submissions that ask for a schema image.                                            |


Run `**01_ddl.sql` before `02_seed.sql**` on an **empty** database.

## Quick start

```bash
# Create database (once)
createdb event_mgmt

# Apply schema, then data
psql -d event_mgmt -f schema/01_ddl.sql
psql -d event_mgmt -f schema/02_seed.sql
```

From `psql` already connected to `event_mgmt`:

```sql
\i schema/01_ddl.sql
\i schema/02_seed.sql
```

## Re-loading seed

PostgreSQL will **reject duplicate keys** if you run `02_seed.sql` again on the same DB. To start over:

```bash
dropdb event_mgmt
createdb event_mgmt
psql -d event_mgmt -f schema/01_ddl.sql
psql -d event_mgmt -f schema/02_seed.sql
```

## Alignment with the project spec

- **§8–§9:** Table columns, `CHECK`s, `**ON DELETE CASCADE`**, unique `payments.booking_id` / `check_ins.booking_id`, `users.username` unique, `users.email` not unique.
- **§5.3:** Status values (`pending` / `ongoing` / `done`, booking and payment statuses, EUR amounts).
- **§10:** Rough volumes (5 / 15 / 5 / 10 / 20 / 40 / 40 payments / subset of check-ins).

Analytics SQL for the three course queries lives in `**../queries/`** (if present), not in this folder.