# Event Management App — project specification

**Status:** Draft — fill every `[ ]` and `_TODO_` before writing final SQL DDL or seed data.

**Rule:** DBML, the schema diagram, and `schema.sql` must match **this** document. If the design changes, update this file first, then regenerate artifacts.

---

## 1. Document readiness checklist (course alignment)

Use this to know when “docs are ready” before implementation.

| Deliverable | Spec section | Ready when |
|-------------|--------------|------------|
| Domain description | §2 | Narrative is complete and unambiguous |
| Entities + scenarios | §3–4 | Every entity has attributes + types decided |
| Relationships | §5 | Cardinalities and optionalities agreed |
| Three SQL queries | §7 | Business definitions fixed (see §6) |
| Schema (SQL + DBML) | §8–9 | Tables/columns/PK/FK/UNIQUE listed |
| Fake data plan | §10 | Counts + rules (e.g. payment status) |
| Indexes | §11 | List + short rationale |

- [ ] Both teammates have read and agreed on §6 (definitions) — **blocks query writing**
- [ ] Specification reviewed once end-to-end

---

## 2. Domain description

_Paste or refine the course-ready paragraph here. A reader who knows nothing about your app should understand the problem space._

_TODO: 1 short paragraph on who uses the system, what they do, and what is stored._

---

## 3. Scope

### 3.1 In scope

- [ ] _(list flows you will support)_

### 3.2 Out of scope

- [ ] _(explicit non-goals to avoid scope creep)_

---

## 4. Critical scenarios (user paths)

Numbered flows for the report. Adjust wording to match your final UX, but keep the **data** implications.

1. _TODO_
2. _TODO_
3. _TODO_
4. _TODO_
5. _TODO_
6. _TODO_
7. _TODO_
8. _TODO_

---

## 5. Entities and relationships

### 5.1 Entity dictionary

For each entity: purpose, primary key name, and main attributes (name + type + NULL allowed? + default?).

| Entity | PK | Notes |
|--------|-----|------|
| organizers | | |
| users | | |
| venues | | |
| events | | |
| ticket_types | | |
| bookings | | |
| payments | | |
| check_ins | | |

### 5.2 Relationship summary

_State cardinality and optionality (e.g. “event N—1 venue, venue optional? Y/N”)._

| From | To | Cardinality | Notes |
|------|-----|---------------|------|
| organizer | events | 1:N | |
| venue | events | 1:N | |
| event | ticket_types | 1:N | |
| user | bookings | 1:N | |
| ticket_type | bookings | 1:N | |
| booking | payments | 1:1 | |
| booking | check_ins | 1:0..1 | |

### 5.3 Open design questions _(resolve before DDL)_

- [ ] Can one **booking** include multiple **ticket types**, or one row per ticket type? _(current README assumes one `ticket_type_id` per booking)_
- [ ] What **booking_status** and **payment_status** values are allowed? _(enum list)_
- [ ] What **event.status** values mean “past” for attendance-rate queries?
- [ ] Is **revenue** counted only when `payment_status = 'completed'` (or similar)?

---

## 6. Definitions for analytics _(required before the 3 SQL queries)_

Ambiguity here is the #1 cause of rework. Agree and paste final text into the report.

### 6.1 “Attendee” (Query 1: count per event)

- **Definition:** _e.g. sum of `bookings.quantity` for completed bookings / or only checked-in / etc._
- **Filters:** _which `booking_status` / `payment_status` rows count?_

### 6.2 “Revenue” (Query 2: per organizer)

- **Definition:** _e.g. sum of `payments.amount` where …_
- **Currency:** _single currency assumed?_

### 6.3 “Attendance rate” (Query 3: last 3 months)

- **Numerator:** _e.g. number of check-ins / or tickets checked in_
- **Denominator:** _e.g. total tickets sold (sum of quantities) for events in window_
- **Time window:** _“past 3 months” from which reference date — `CURRENT_DATE` in SQL demo?_
- **Which events:** _only `status = 'completed'`? only past `end_datetime`?_

---

## 7. Required SQL queries — expected shape

Document intended result columns so implementation matches the report.

### Query 1 — Attendees per event

- **Expected columns:** _e.g. `event_id`, `event_name`, `total_attendees`_
- **Notes:** _join path, GROUP BY, handling events with zero bookings_

### Query 2 — Revenue per organizer

- **Expected columns:** _e.g. `organizer_id`, `organizer_name`, `total_revenue`_
- **Notes:** _join path, filters on payment status_

### Query 3 — Average attendance rate (last 3 months)

- **Expected columns:** _e.g. single row `avg_attendance_rate` or per-event then averaged — pick one_
- **Notes:** _how “3 months” is applied in SQL_

---

## 8. Table-level schema (authoritative list)

_Adjust to match §5–6. Use SQL names (`snake_case` recommended)._

### organizers

_TODO: columns, types, constraints, UNIQUE(email)?_

### users

_TODO_

### venues

_TODO_

### events

_TODO_

### ticket_types

_TODO_

### bookings

_TODO_

### payments

_TODO_

### check_ins

_TODO_

---

## 9. Constraints and integrity

- **UNIQUE:** _e.g. user email, organizer email_
- **CHECK:** _e.g. price ≥ 0, quantity ≥ 1_
- **FK actions:** `ON DELETE RESTRICT` vs `CASCADE` — _decide per relationship_
- **Timestamps:** timezone handling _(often “store UTC” or “naive local” for coursework — pick one and state it)_

---

## 10. Fake data plan

| Target | Count | Notes |
|--------|-------|------|
| Organizers | 5 | |
| Users | 15 | |
| Venues | 5 | |
| Events | 10 | |
| Ticket types | 20 | |
| Bookings | 30–50 | |
| Payments | | _one per booking? partial failures?_ |
| Check-ins | | _subset of bookings for past events_ |

- [ ] Seed data respects all FKs and CHECK constraints
- [ ] Enough variety that all 3 queries return non-empty, believable results

---

## 11. Indexes

| Table | Column(s) | Rationale |
|-------|-----------|-----------|
| events | organizer_id, venue_id | FK + filter/join |
| ticket_types | event_id | FK + join |
| bookings | user_id, ticket_type_id | FK + join |
| payments | booking_id | FK + join |
| check_ins | booking_id | FK + join |
| _(add)_ | | _e.g. `events(start_datetime)` if you filter by date often_ |

---

## 12. Naming and file conventions _(optional but helps a team of 2)_

- **Repo files:** _e.g. `schema/schema.sql`, `schema/schema.dbml`, `schema/erd.png`_
- **Table names:** plural vs singular — _pick one_
- **Primary keys:** `table_singular_id` vs `id` — _pick one_

---

## 13. Sign-off

| Name | Role | Date | Signature / “OK” |
|------|------|------|------------------|
| | | | |
| | | | |
