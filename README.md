# Event Management App — Database Fundamentals Project

An Event Management App for the **Database Fundamentals** course. The emphasis is on database design, schema, queries, and light integration into a simple application, aligned with the course project brief.

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
| **Payments** | **One payment row per booking** (`booking_id` unique). |
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

## Proposed schema (draft)

### `organizers`

- `organizer_id`, `organizer_name`, `email`, `phone`, `created_at`

### `users`

- `user_id`, `username` (unique), `full_name`, `email` (required, not unique), `phone`, `created_at`

### `venues`

- `venue_id`, `venue_name`, `address`, `city`, `capacity`

### `events`

- `event_id`, `organizer_id`, `venue_id` (required), `event_name`, `description`, `category`, `start_datetime` (required), `end_datetime` (required), `status`, `created_at`

### `ticket_types`

- `ticket_type_id`, `event_id`, `ticket_name`, `price`, `quantity_available`

### `bookings`

- `booking_id`, `user_id`, `ticket_type_id`, `quantity`, `booking_date`, `booking_status`

### `payments`

- `payment_id`, `booking_id`, `amount`, `payment_method`, `payment_status`, `payment_date`

### `check_ins`

- `check_in_id`, `booking_id`, `check_in_time`, `checked_in_by`

---

## Required SQL queries (examples)

1. **Query 1:** Count total attendees per event  
2. **Query 2:** Total revenue from ticket sales per organizer  
3. **Query 3:** Average attendance rate for events in the past 3 months  

---

## Fake data plan

Target volumes for realistic demos and meaningful query results:

- 5 organizers  
- 15 users  
- 5 venues  
- 10 events  
- 20 ticket types  
- 30–50 bookings  
- **One payment per booking** (include some `pending` / `failed` for realism; revenue uses `completed` only)  
- Check-ins for a subset of past / `done` events (not every booking)  

---

## Indexes / optimization

Suggested indexes on foreign keys and hot columns:

- `events.organizer_id`, `events.venue_id`  
- `events.start_datetime` (time-range browse / “upcoming” lists)  
- `ticket_types.event_id`  
- `bookings.user_id`, `bookings.ticket_type_id`  
- `payments.booking_id`  
- `check_ins.booking_id`  

Document these in the report as performance considerations.

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

The MVP covers **email or username + password** auth (register inserts into `users` with a bcrypt `password_hash`; JWT session), browsing events (optional start-time range), creating a booking as the signed-in user with an immediate **completed** payment (inventory decremented), overlap **warnings** (non-blocking, per spec), the three **analytics** endpoints aligned with `docs/specification.md` section 6, and **check-ins** for an event. After a fresh seed, you can log in with email `alex.m@student.edu` and password `demo123` (only `user_id` 1 receives a demo hash so email login stays unambiguous with shared seed emails).

---

## Work split (example)

| Area | Owner A | Owner B |
|------|---------|---------|
| Domain, scenarios, entities, DBML, schema image, report | ✓ | |
| SQL DDL, seed data, 3 queries, indexes, optional MVP/backend/demo | | ✓ |
| **Shared** | Review, consistent naming, final submission | |

---

## Next steps

1. Finalize the entity list  
2. Create the DBML schema  
3. Generate the schema image  
4. Write SQL DDL  
5. Add fake data  
6. Write the 3 required SQL queries  
7. Add indexes  
8. Decide on a simple MVP / demo  

---

## Guiding principle

Keep the project **simple, clean, and database-focused**. A smaller, correct submission is better than an overambitious, messy one.
