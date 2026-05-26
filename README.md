# Event Management App — Database Fundamentals Project

An Event Management App for the **Database Fundamentals** course. The emphasis is on database design, schema, queries, and light integration into a simple application, aligned with the course project brief.

## Live demo (deployed MVP)

**URL:** [https://db-proj-2026-event-planner.onrender.com/](https://db-proj-2026-event-planner.onrender.com/)

![Demo QR code — scan to open the live app](docs/demo-qr.png)

*QR encodes:* `https://db-proj-2026-event-planner.onrender.com/`

First load on Render free tier may take ~30s while the service wakes up.

**MVP overview:** [`docs/MVP.md`](docs/MVP.md) (screens, API, roles).  
**Documentation first:** finalize the living spec ([`docs/specification.md`](docs/specification.md)) — especially definitions for the three analytics queries — before locking DBML, SQL DDL, and seed data.

## Course deliverables

### Minimum required

- Entities description and most critical scenarios / common user paths
- Domain description
- Database schema in **SQL** and **DBML**
- Database schema image
- Some fake but valid data
- **3 SQL queries** against the database
- Indexes / performance optimizations where needed

### Recommended for a higher score

- Everything above
- A working **MVP** (at least locally) with a **recorded demo**
- Ideally a **deployed** app (database, backend, frontend) in the cloud

**Deadline:** May 30  

**Team size:** Groups of up to 3 students

---

## Chosen topic

**Event Management App** — one of the suggested course ideas. The project sheet suggests three SQL tasks for this domain:

1. Count total attendees for each event  
2. Calculate total revenue from ticket sales for each organizer  
3. Find the average attendance rate for events in the past 3 months  

---

## Scope

**In scope**

- Organizers create and manage events  
- Users browse events  
- Users book tickets  
- Payments are recorded  
- Attendees can be checked in  
- Organizers monitor attendance and revenue  

**Out of scope (by design)**

- No large product features: chat, social feed, recommendations, maps, etc.  
- The focus stays on the **database**.

---

## Domain description

The app supports organizing and managing events such as conferences, workshops, networking sessions, and student activities. Organizers create events, define ticket types, and monitor registrations. Users browse events, book tickets, pay, and attend. The system stores organizers, venues, events, ticket categories, bookings, payments, and check-ins. The database must support event creation, booking, payment tracking, revenue analysis, and attendance monitoring.

---

## Critical scenarios / user paths

1. An organizer creates an account  
2. The organizer creates an event  
3. The organizer selects a venue and defines one or more ticket types  
4. A user browses available events  
5. A user books one or more tickets for an event  
6. A payment record is created for the booking  
7. On event day, attendees are checked in  
8. The organizer reviews attendance and revenue statistics  

---

## Main entities

| Entity        | Description |
|---------------|-------------|
| **Users**     | People who browse events and make bookings |
| **Organizers** | Individuals or orgs that create and manage events |
| **Venues**    | Physical locations where events are hosted |
| **Events**    | Conferences, workshops, seminars, etc. |
| **TicketTypes** | Categories per event (e.g. General, Student, VIP) |
| **Bookings**  | Reservations for event tickets |
| **Payments**  | Payment records linked to bookings |
| **CheckIns**  | Attendance confirmation for booked users |

---

## Relationships

- One **organizer** → many **events**  
- One **venue** → many **events**  
- One **event** → many **ticket types**  
- One **user** → many **bookings**  
- One **ticket type** → many **bookings**  
- One **booking** → one **payment**  
- One **booking** → zero or one **check-in**  

---

## Design decisions

Single source of detail: [`docs/specification.md`](docs/specification.md) (§5.3, §6, §10). Summary:

| Topic | Decision |
|--------|-----------|
| **Payments** | **One payment row per booking** (composite PK matches booking: user + ticket type + booking time). |
| **Venue** | Every event has a venue — **`events.venue_id` NOT NULL**. |
| **Event status** | `pending`, `ongoing`, `done`. |
| **Booking status** | `pending`, `confirmed`, `cancelled`. |
| **Payment status** | `pending`, `completed`, `failed`. |
| **Revenue** | Sum amounts only when **`payment_status = 'completed'`**. |
| **Currency** | **EUR**. |
| **Refunds** | None (see spec §3.4). |
| **FK deletes** | **`ON DELETE CASCADE`** on all foreign keys (see spec §9). |
| **Users** | **`username` UNIQUE**; **`email` not unique** (see spec §5.3, §8). |

---

## Schema and SQL (source of truth)

- **DDL + seed:** [`schema/01_ddl.sql`](schema/01_ddl.sql), [`schema/02_seed.sql`](schema/02_seed.sql) — see [`schema/README.md`](schema/README.md)
- **ERD / DBML:** [`schema/schema.dbml`](schema/schema.dbml), [`schema/ERD.png`](schema/ERD.png)
- **Course analytics:** [`queries/`](queries/) (definitions in spec §6)

---

## Required SQL queries (examples)

1. **Query 1:** Count total attendees per event  
2. **Query 2:** Total revenue from ticket sales per organizer  
3. **Query 3:** Average attendance rate for events in the past 3 months  

---

## Seed data and indexes

Volumes, statuses, and index list: **`docs/specification.md` §10** and **`schema/01_ddl.sql`** (indexes are in DDL).

---

## Suggested tech stack

| Layer    | Technology |
|----------|------------|
| Frontend | React |
| Backend  | FastAPI (Python) |
| Database | PostgreSQL |
| ORM      | Optional (e.g. SQLAlchemy) |

**Deploy:** step-by-step guide in [`docs/DEPLOY.md`](docs/DEPLOY.md) (Render + Postgres recommended). Repo includes [`render.yaml`](render.yaml) for a one-click blueprint.

### Local MVP (FastAPI + React)

Prerequisites: PostgreSQL with the `event_mgmt` database and `schema/01_ddl.sql` + `schema/02_seed.sql` applied (see [`schema/README.md`](schema/README.md)).

**API (terminal 1):**

```bash
cd backend
cp .env.example .env
# Edit .env: DATABASE_URL if needed, and set JWT_SECRET to a long random string (required for signing login tokens).

python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Web UI (terminal 2):**

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. During development, Vite proxies `/api` to `http://127.0.0.1:8000`. The SPA uses client routes (for example `/login`, `/events`, `/events/9`, `/analytics`, `/check-in`); unknown paths under a logged-in session redirect to `/events`.

The MVP covers **email or username + password** auth (register inserts into `users` with a bcrypt `password_hash`; JWT session), browsing events (optional start-time range), creating a booking as the signed-in user with an immediate **completed** payment (inventory decremented), overlap **warnings** (non-blocking, per spec), the three **analytics** endpoints aligned with `docs/specification.md` section 6, and **check-ins** for an event. After a fresh seed, use **Register** on the sign-in page for guests; organizer sign-in uses seeded `organizers` rows with `password_hash` (see end of `schema/02_seed.sql`).

---

## Work split (example)

| Area | Owner A | Owner B |
|------|---------|---------|
| Domain, scenarios, entities, DBML, schema image, report | ✓ | |
| SQL DDL, seed data, 3 queries, indexes, optional MVP/backend/demo | | ✓ |
| **Shared** | Review, consistent naming, final submission | |

---

## Repository layout

| Path | Purpose |
|------|---------|
| `docs/specification.md` | Authoritative business rules |
| `docs/MVP.md` | MVP screens, API, roles, local run |
| `schema/` | DDL, seed, DBML, ERD |
| `queries/` | Three course SQL reports |
| `backend/` | FastAPI API (+ `static/` after frontend build) |
| `frontend/` | React MVP |
| `scripts/` | Remote DB bootstrap (`bootstrap_remote_db.sh`) and repo cleanup helpers |
| `docs/DEPLOY.md` | Render deployment |

---

## Guiding principle

Keep the project **simple, clean, and database-focused**. A smaller, correct submission is better than an overambitious, messy one.
