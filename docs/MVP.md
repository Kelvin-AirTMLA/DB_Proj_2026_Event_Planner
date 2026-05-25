# Event Management MVP

Lightweight **React + FastAPI** app that demonstrates the PostgreSQL schema in [`specification.md`](specification.md). The UI is a **lens on the database** — grading focus stays on design, SQL, and analytics definitions (§6).

**Live demo:** [https://event-management-lzcd.onrender.com/](https://event-management-lzcd.onrender.com/)  
**Deploy steps:** [`DEPLOY.md`](DEPLOY.md) · **Full spec:** [`specification.md`](specification.md)

---

## Architecture

```text
Browser → same origin (Render or local)
  /api/*     → FastAPI (JWT auth, SQL via psycopg)
  /*         → React static build (Vite → backend/static in production)
```

PostgreSQL holds all state. No ORM — SQL matches course `queries/*.sql` and spec §6.

---

## Roles

| Role | Table | Sign up | Typical screens |
|------|--------|---------|-----------------|
| **Guest** | `users` | **Register** on sign-in | Browse events, book tickets, my bookings |
| **Organizer** | `organizers` | **Register** (organizer tab) or seeded row | My stats, door check-in, create event, browse (own events) |

JWT payload includes `role` (`guest` | `organizer`) and subject id. Wrong role on a protected route → **403**.

Guests **cannot** open organizer analytics or check-in. Organizers **cannot** book tickets in the MVP.

---

## Screens → database operations

| Screen / flow | SQL operation (simplified) |
|---------------|----------------------------|
| Browse events (+ optional date filters) | `SELECT` `events` (+ joins to venue/organizer) |
| Event detail & book | `INSERT` `bookings`, `INSERT` `payments` (`completed`), decrement `ticket_types.quantity_available` |
| Overlap warning before book | `SELECT` overlapping bookings for user (warn only; booking still allowed per spec §3.5) |
| No-refund confirm modal | UX only — policy in spec §3.4 |
| My bookings (guest) | `SELECT` bookings/payments for current user (read-only; no cancel in UI) |
| Create event (organizer) | `INSERT` `events`, `INSERT` `ticket_types` (default **Standard** tier) |
| Door check-in (organizer) | `INSERT` `check_ins` for a booking on their event |
| My stats (organizer) | Analytics APIs — same definitions as `queries/01–03.sql` |

---

## HTTP API (summary)

**Health:** `GET /api/health` · `GET /api/ready` (DB connectivity)

**Auth** (`/api/auth/…`):

- Guest: `POST /register`, `POST /login`, `POST /login/username`, `GET /me`
- Organizer: `POST /register/organizer`, `POST /login/organizer`, `POST /login/organizer/username`, `GET /me`

**Data** (Bearer token required unless noted):

| Method | Path | Role |
|--------|------|------|
| GET | `/api/events`, `/api/events/{id}` | either (browse) |
| GET | `/api/venues` | either |
| POST | `/api/events` | organizer |
| GET | `/api/bookings/overlap-warning` | guest |
| POST | `/api/bookings` | guest |
| GET | `/api/bookings/mine` | guest |
| GET | `/api/events/{id}/bookings` | organizer (own events) |
| POST | `/api/check-ins` | organizer |
| GET | `/api/analytics/attendees-per-event` | organizer |
| GET | `/api/analytics/revenue-per-organizer` | organizer |
| GET | `/api/analytics/attendance-rate-last-3-months` | organizer |

Public: `GET /api/organizers` (list for reference).

---

## Business rules enforced in the MVP

- **EUR** amounts; **one payment row per booking** (`payments.booking_id` UNIQUE).
- Booking creates **immediate** `payment_status = 'completed'` (demo checkout — not a real payment gateway).
- **Revenue / attendee analytics** use **`payment_status = 'completed'`** only (spec §6).
- **No refunds** — no cancel button in UI; sales are final (spec §3.4).
- **Overlap bookings:** warning shown, not blocked.
- **FK deletes:** `ON DELETE CASCADE` per spec §9.

---

## Local run (short)

1. Apply [`../schema/01_ddl.sql`](../schema/01_ddl.sql) and [`../schema/02_seed.sql`](../schema/02_seed.sql) — see [`../schema/README.md`](../schema/README.md).
2. **API:** `cd backend` → `.env` from `.env.example` → `uvicorn app.main:app --reload --port 8000`.
3. **UI:** `cd frontend` → `npm install` → `npm run dev` → [http://localhost:5173](http://localhost:5173).

Use **Register** for new accounts on the sign-in page. Seeded rows with `password_hash` are described in `schema/02_seed.sql` (no shared passwords in public docs).

---

## Out of scope (by design)

Chat, recommendations, maps, multi-currency, refunds, real payment providers, organizer booking-as-guest, multi-tier ticket UI on create (single **Standard** tier from form).

---

## Related docs

| File | Purpose |
|------|---------|
| [`specification.md`](specification.md) | Authoritative rules and schema |
| [`DEPLOY.md`](DEPLOY.md) | Render + Postgres |
| [`DEFENSE_PRESENTATION.md`](DEFENSE_PRESENTATION.md) | Oral defense slides (Marp) |
| [`BLUEPRINT_AND_TEAMMATE_GUIDE.md`](BLUEPRINT_AND_TEAMMATE_GUIDE.md) | Blueprint alignment + teammate LLM prompts |

Implementation code lives on **`main`** (`backend/`, `frontend/`). This **`docs`** branch carries documentation only.
