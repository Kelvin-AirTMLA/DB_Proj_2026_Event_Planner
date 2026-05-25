# Defense presentation — speaker notes (not slides)

**Slides source:** `docs/DEFENSE_PRESENTATION.md` (Marp)

**Export PDF + HTML:**

```bash
./scripts/export_presentation.sh
```

**VS Code:** install extension [Marp for VS Code](https://marketplace.visualstudio.com/items?itemName=marp-team.marp-vscode) → open `DEFENSE_PRESENTATION.md` → preview (Cmd+Shift+P → “Marp: Open Preview”) or export.

**Outputs:** `docs/DEFENSE_PRESENTATION.pdf` · `docs/DEFENSE_PRESENTATION.html`

---

## Timing (7 minutes)

| Slide | Presenter | Target |
|-------|-----------|--------|
| 1 Title | Saif | 20 s |
| 2 Scope | Saif | 40 s |
| 3 Lifecycle | Saif | 50 s |
| 4 Bookings / payments / check-ins | Kelvin | 45 s |
| 5 Schema | Kelvin | 70 s |
| 6 Keys + seed | Kelvin | 50 s |
| 7 Frontend demo | Kelvin | 70 s |
| 8 Analytics overview | Saif | 60 s |
| 9 Revenue SQL | Kelvin | 35 s |
| 10 Attendance rate | Kelvin | 25 s |
| 11 Conclusion | Saif | 25 s |

**Saif ~3 min · Kelvin ~4 min**

---

## Slide-by-slide script

**1 — Saif:** We built an event management **database system**: organizers create events, users book and pay, check-ins record attendance, SQL produces the three course reports.

**2 — Saif:** Scope is database-first — 8 tables, simple MVP, three analytics queries. We excluded social features, recommendations, maps, and refunds to stay defendable.

**3 — Saif:** The lifecycle maps to real SQL: insert events and ticket types, insert bookings and payments, insert check-ins, then SELECT with joins for reports.

**4 — Kelvin:** We split intent (bookings), revenue truth (completed payments), and attendance truth (check-ins). Mixing them would break analytics.

**5 — Kelvin:** Eight tables — five entity tables on the left, three transaction tables on the right. Bookings always reference a ticket type; payments are one-to-one with bookings.

**6 — Kelvin:** Foreign keys prevent orphans; CHECK constraints enforce statuses and dates. Seed data matches spec counts and includes pending/failed payments and missing check-ins for no-shows.

**7 — Kelvin:** Every MVP screen is a database operation — browse is SELECT, book is INSERT into bookings and payments, create event adds events plus a Standard ticket type row.

**8 — Saif:** Query 1 sums sold seats with confirmed + completed. Query 2 sums payment amounts when completed. Query 3 compares check-ins to bookings in the last three months.

**9 — Kelvin:** Revenue uses a CASE on payment_status and SUM of amount — not raw bookings and not ticket price alone when quantity > 1.

**10 — Kelvin:** Attendance rate shows booking intent versus check-in reality — useful when many book but few show up.

**11 — Saif:** We delivered schema, constraints, seed, SQL queries, and a live demo. The value is the relational model, not the UI polish.

---

## Q&A quick answers

| Question | Answer |
|----------|--------|
| Why not one big table? | Redundant organizer/venue/event data; updates would be unsafe. |
| Bookings vs payments vs check-ins? | Intent · revenue · actual attendance. |
| Why completed payments only? | Pending/failed were never earned revenue. |
| Why `ticket_types`? | Multiple prices/capacities per event; bookings link to a tier. |
| Why `payments.booking_id` UNIQUE? | Enforces one payment row per booking. |
| Why CHECK constraints? | Invalid statuses, negative amounts, end before start blocked in DB. |
| What does the frontend prove? | Real INSERT/SELECT flow end-to-end. |
| Why LEFT JOIN in query 2? | Show organizers with zero revenue. |
| Guest vs organizer tables? | Different roles; JWT `role` + separate login (spec §5.4). |
| Future work? | DB transactions on book+pay, stronger concurrency, more analytics periods. |

---

## Assets to add on slide 7 (optional)

Paste 4 MVP screenshots into the Marp slide or PDF after export: browse, book, create event, check-in.
