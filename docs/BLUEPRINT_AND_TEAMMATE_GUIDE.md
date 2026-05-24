# Event Engine Blueprint vs MVP — and guide for Saif’s LLM

This document compares the **Event Engine Blueprint** PDF (`Event_Engine_Blueprint_(2).pdf`) with our repo (`docs/specification.md`, schema, queries, MVP), and gives **copy-paste instructions** for a teammate’s LLM (Saif: validation, business logic, SQL defense).

**Authoritative sources:** `docs/specification.md`, `schema/01_ddl.sql`, `schema/02_seed.sql`, `queries/*.sql`, `schema/schema.dbml`.

---

## Part 1 — Blueprint vs our project

### Overall verdict

The blueprint and our project describe the **same course system**: PostgreSQL-first event management, 8 tables, lifecycle **create → book → pay → check-in → analytics**, small scope, no social/maps/recommendations. The repo **matches the blueprint** on schema, seed scale, philosophy, and core workflows. A few slides use **slightly different SQL** than our graded `queries/*.sql`; **`docs/specification.md` is more precise** in places.

### Strong alignment

| Blueprint | Our spec / MVP |
|-----------|------------------|
| **8 tables** (users, organizers, venues, events, ticket_types, bookings, payments, check_ins) | Same in `schema/01_ddl.sql` and spec §8 |
| **Intent vs reality** — analytics use `payment_status = 'completed'` (and check-ins for attendance) | Spec §6; queries filter completed payments |
| **Out of scope** — no social platform, recommendations, overbuilt UI | Spec §3.2; README |
| **Seed scale** — 5 organizers, 5 venues, 10 events, 15 users, 20 ticket types, 40 bookings, 40 payments, 18 check-ins | Spec §10; bootstrap script output |
| **Statuses** — `booking_status`, `payment_status` with CHECK constraints | Spec §5.3; DDL |
| **Lifecycle** — INSERT events/tickets → bookings → payment → check_ins → SELECT analytics | API + UI |
| **3 analytics themes** — attendance, organizer revenue, attendance rate (3 months) | `queries/01–03.sql` + `/api/analytics/*` |
| **MVP screens** (blueprint slide 13) | Browse/filter events, book+pay, create event, check-in — `frontend/src/App.tsx` |
| **Frontend as lens** | FastAPI + React demo; grading focus on DB (blueprint slide 10) |

### Small differences (analytics SQL)

| Blueprint slide | Our `queries/` | Note |
|-----------------|----------------|------|
| **Slide 11** — per-event rate: check_ins ÷ bookings in last 3 months | `03_attendance_rate_last_3_months.sql` | Very close — same join path and formula |
| **Slide 12** — revenue uses `tt.price` when `payment_status = 'completed'` | `02_revenue_per_organizer.sql` uses **`p.amount`** | **Spec version is better** when `quantity > 1` |
| **Course query 1** — “attendees per event” | `01_attendees_per_event.sql` sums **`bookings.quantity`** with confirmed + completed | Slide 11 is a *different* metric (turnout rate), not attendee count |

### Query 3 wording

- **Spec §6.3** describes an **average** attendance rate over a 3‑month window (numerator: check_ins, denominator: sold tickets).
- **Blueprint slide 11** and **`03_*.sql`** report **per-event** rates, not one global average.
- For the report: **pick one definition** and state it clearly (per-event table vs single `AVG(...)` row). Both are defensible if §6 matches the SQL.

### Create event / ticket types

- Blueprint MVP shows **multiple ticket types** on create (e.g. General, VIP).
- **Spec §5.4** — one default **`Standard`** row from the form; no multi-tier UI.
- Aligns with “no overbuilt UI”; blueprint screenshots are aspirational, not stricter than our spec.

### In our MVP / spec but not emphasized in blueprint

| Feature | Where |
|---------|--------|
| Separate **guest** (`users`) vs **organizer** auth, JWT roles | Spec §5.4; `auth_routes.py`, `AuthGate.tsx` |
| **Register** guest and organizer | API + UI |
| **Cancel booking** (no refund) | Spec §5.4; `POST /api/bookings/{id}/cancel` |
| **Overlap warning** on book (warn, don’t block) | Spec §3.5; `/api/bookings/overlap-warning` |
| **Organizer-scoped** “My stats” in UI; global SQL in `queries/` | Spec §5.4 |
| **Deploy** (Render, `DATABASE_URL`) | `docs/DEPLOY.md` |
| **No edit event** | Spec §5.4 |

### Gaps to defend at submission

| Blueprint expectation | Our project today |
|----------------------|-------------------|
| **“Admin view: show query results”** (slide 10) | Analytics tab is **organizer-only**; for grading, run **`queries/*.sql`** in psql or add a read-only “course queries” view |
| **Integrity checks** (slide 9) — no overselling, payment math, orphans | Partly in app (inventory on book); **no DB transactions** yet — blueprint slide 14 lists that as **future** |
| **Browse filters** (date range) | Spec §3.1; `GET /api/events?start_from=&start_to=` — demo filters clearly in the UI |
| **Revenue: organizers with €0** | Query 02 uses `LEFT JOIN` from organizers — matches blueprint Rule 2 |

### Philosophy (blueprint slide 4)

Blueprint: raw bookings ≠ revenue/attendance; only **completed payments** and **check_ins** count for “truth.”

Our project:

- **Query 01** — attendees = **confirmed** booking + **completed** payment.
- **Query 02** — revenue = **`payments.amount`** where completed.
- **Query 03** — rate from **check_ins** vs **bookings** (slide 11 style).

Use the same language in the report so scope/SQL and schema/MVP sections align.

### Defense split (blueprint slide 2)

| Person | Blueprint focus | Evidence in repo |
|--------|-----------------|------------------|
| **Saif** | Scope, user paths, 3 SQL queries, validation | `docs/specification.md` §3–7, `queries/*.sql` |
| **Kelvin** | Schema, ERD, GitHub, MVP demo | `schema/`, `schema/schema.dbml`, `frontend/`, `docs/DEPLOY.md` |

### Bottom line

| Question | Answer |
|----------|--------|
| Same project as blueprint? | **Yes** — same domain, tables, lifecycle, seed counts, exclusions. |
| MVP “wrong” vs blueprint? | **No** — core flows match; simplified ticket UI and extra auth/cancel/deploy per spec. |
| Tighten before submission? | (1) Align **query 3** wording with §6. (2) Demo **date filters** on browse. (3) Show **`queries/*.sql`** globally for grading, not only organizer-scoped UI stats. |

### Slide-to-repo map (defense cheat sheet)

| Slide | Topic | Repo / doc |
|-------|--------|------------|
| 1 | Title / stack | README, PostgreSQL + SQL + ERD |
| 2 | Ownership | This file; spec sign-off §13 |
| 3 | Scope boundary | spec §3.1–3.2 |
| 4 | Intent vs reality | spec §6; queries filters |
| 5 | 8 tables | `schema/01_ddl.sql`, `schema.dbml` |
| 6 | Constraints | DDL CHECK + FK |
| 7 | Seed scale | `schema/02_seed.sql`, `scripts/bootstrap_remote_db.sh` |
| 8 | Lifecycle | spec §4; API routes |
| 9 | Integrity | seed + app booking logic |
| 10 | Frontend as lens | `frontend/`, `backend/app/main.py` |
| 11 | Analytics 1 (engagement rate) | `queries/03_*.sql` (similar) |
| 12 | Analytics 2 (revenue) | `queries/02_*.sql` |
| 13 | MVP workflows | `App.tsx` routes |
| 14 | Future work | transactions, concurrency — out of MVP |

---

## Part 2 — Guide for Saif’s LLM

Share this section with a teammate’s assistant so it stays useful and does not conflict with schema/MVP work.

### Scope prompt (copy-paste)

```text
You are helping with the Database Fundamentals Event Management project.
Authoritative sources: docs/specification.md, queries/*.sql, schema/01_ddl.sql, schema/02_seed.sql.
Do not redesign tables, rename columns, or change DDL without updating the spec first.
Kelvin owns: schema, ERD, GitHub structure, FastAPI/React MVP, deploy.
Saif owns: scope narrative, user paths, definitions for the 3 analytics queries,
validation rules, and defending SQL business logic in the report.
```

### What the LLM should focus on

| Do | Don’t |
|----|--------|
| Write/refine **report text** for §2–4, §6 (definitions), §7 (query intent) | Invent new tables or features (refunds, maps, recommendations) |
| Check **`queries/01–03.sql`** match **§6** exactly | Change revenue to `ticket_types.price` instead of **`payments.amount`** when quantity can be > 1 |
| Explain **intent vs reality** (bookings vs completed payments vs check_ins) | Assume every booking row counts for revenue or attendance |
| List **validation checks** (orphans, overselling, payment 1:1 with booking) | Rewrite the whole frontend or auth system |
| Prepare **defense answers** for the 3 course questions | Edit `01_ddl.sql` without syncing DBML + spec |

### The three queries — canonical definitions (from spec)

**Query 1 — Attendees per event**

- Sum **`bookings.quantity`** where **`booking_status = 'confirmed'`** and **`payment_status = 'completed'`**.
- Not raw bookings; not cancelled; not failed payments.
- File: `queries/01_attendees_per_event.sql`

**Query 2 — Revenue per organizer**

- Sum **`payments.amount`** where **`payment_status = 'completed'`**, joined booking → ticket_type → event → organizer.
- Use **`LEFT JOIN` from organizers** so organizers with €0 still appear.
- File: `queries/02_revenue_per_organizer.sql`

**Query 3 — Attendance rate (last 3 months)**

- Spec §6.3: numerator = **check_ins**, denominator = **sold tickets** (completed payments), window on **`end_datetime`** or **`start_datetime`** — **pick one and state it in the report**.
- Current `03_*.sql` is **per-event** check-ins ÷ bookings; course brief may ask for an **average** — choose **one** clear definition for the oral exam.

### Blueprint vs repo (tell the LLM not to panic)

- MVP create event uses **one default “Standard” ticket** — not multi-tier UI in the slides.
- App analytics are **organizer-scoped**; graded SQL in `queries/` is **global** — intentional (spec §5.4).
- Slide 11’s “engagement rate” is close to **`03_*.sql`**; slide 12’s `tt.price` is **weaker** than **`p.amount`** — defend the spec version.

### Good prompts for Saif

```text
Read docs/specification.md §6 and queries/01_attendees_per_event.sql.
Do the SQL and the definitions say the same thing? List any mismatch in one table.
```

```text
Draft 2 paragraphs for the report: "Intent vs reality" using only
booking_status, payment_status, and check_ins. No new features.
```

```text
For query 3, we use per-event rates in 03_*.sql but §6.3 mentions average.
Propose ONE definition we can defend in the oral exam and whether we need
a second query or just clarify the report.
```

```text
List 5 data-integrity checks our seed data should pass (orphans, oversell,
payment per booking, etc.) and how to verify each with a single SQL statement.
```

### Hard rules (avoid merge pain)

- No refunds, multi-currency, or social features.
- No changing status string values (`pending` / `confirmed` / `completed`, etc.).
- No “fixing” guest vs organizer auth — already in spec §5.4.
- No committing `.env` or Render URLs with passwords.
- If **`queries/*.sql`** changes, update **`docs/specification.md` §6–7** in the same change.

### One line for the oral defense

> “We treat **bookings** as intent, **completed payments** as revenue truth, and **check_ins** as physical attendance truth; analytics SQL only uses the last two where the business question requires it.”

---

## Part 3 — Production deploy reminder (register 500)

If **`POST /api/auth/register`** returns 500 but **`GET /api/health`** works:

1. On Render **web service** (`event-management`), set **`DATABASE_URL`** to Postgres **Internal Database URL**.
2. From laptop once: `export DATABASE_URL='<External URL>'` then `./scripts/bootstrap_remote_db.sh`.
3. After redeploy, optional: `GET /api/ready` (if deployed) should report database connected.

See **`docs/DEPLOY.md`** for full steps.

---

## Short summary for teammates

| Role | Focus |
|------|--------|
| **Saif’s LLM** | `specification.md` + `queries/` — definitions, report, validation, SQL defense |
| **Kelvin’s LLM** | `schema/`, ERD, MVP, deploy — do not let Saif’s LLM change DDL without spec update |

Point any LLM at this file plus **`docs/specification.md`** before asking it to change SQL or write report sections.
