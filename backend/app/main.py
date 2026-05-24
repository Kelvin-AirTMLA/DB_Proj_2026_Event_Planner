from decimal import Decimal
from pathlib import Path
from typing import Annotated, Any, Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app.auth_routes import router as auth_router
from app.config import settings
from app.db import get_cursor
from app.deps import get_current_guest_id, get_current_organizer_id
from app.serialize import serialize_row

app = FastAPI(title="Event Management API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/ready")
def ready() -> dict[str, str]:
    """Checks DB connectivity (use after deploy; /api/health does not touch Postgres)."""
    try:
        with get_cursor() as cur:
            cur.execute("SELECT to_regclass('public.users') AS users_table")
            row = cur.fetchone()
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Database unavailable ({type(exc).__name__}). "
            "On Render: set DATABASE_URL on the web service and run scripts/bootstrap_remote_db.sh once.",
        ) from exc
    if not row or row.get("users_table") is None:
        raise HTTPException(
            status_code=503,
            detail="Database connected but schema missing. Run scripts/bootstrap_remote_db.sh against your Render Postgres URL.",
        )
    return {"status": "ready", "database": "connected"}


@app.get("/api/organizers")
def list_organizers() -> list[dict[str, Any]]:
    with get_cursor() as cur:
        cur.execute(
            """
            SELECT organizer_id, organizer_name, email
            FROM organizers
            ORDER BY organizer_id
            """
        )
        rows = cur.fetchall()
    return [serialize_row(dict(r)) for r in rows]


@app.get("/api/events")
def list_events(
    start_from: Optional[str] = None,
    start_to: Optional[str] = None,
    organizer_id: Optional[int] = None,
) -> list[dict[str, Any]]:
    where: list[str] = []
    params: list[Any] = []
    if organizer_id is not None:
        where.append("e.organizer_id = %s")
        params.append(organizer_id)
    if start_from:
        where.append("e.start_datetime >= %s")
        params.append(start_from)
    if start_to:
        where.append("e.start_datetime < %s")
        params.append(start_to)
    clause = ("WHERE " + " AND ".join(where)) if where else ""
    sql = f"""
        SELECT
            e.event_id,
            e.event_name,
            e.category,
            e.status,
            e.start_datetime,
            e.end_datetime,
            v.venue_name,
            v.city,
            o.organizer_name
        FROM events e
        JOIN venues v ON v.venue_id = e.venue_id
        JOIN organizers o ON o.organizer_id = e.organizer_id
        {clause}
        ORDER BY e.start_datetime
    """
    with get_cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
    return [serialize_row(dict(r)) for r in rows]


@app.get("/api/events/{event_id}")
def get_event(event_id: int) -> dict[str, Any]:
    with get_cursor() as cur:
        cur.execute(
            """
            SELECT
                e.event_id,
                e.organizer_id,
                e.venue_id,
                e.event_name,
                e.description,
                e.category,
                e.status,
                e.start_datetime,
                e.end_datetime,
                v.venue_name,
                v.address,
                v.city,
                v.capacity,
                o.organizer_name
            FROM events e
            JOIN venues v ON v.venue_id = e.venue_id
            JOIN organizers o ON o.organizer_id = e.organizer_id
            WHERE e.event_id = %s
            """,
            (event_id,),
        )
        ev = cur.fetchone()
        if not ev:
            raise HTTPException(status_code=404, detail="Event not found")
        cur.execute(
            """
            SELECT ticket_type_id, ticket_name, price, quantity_available
            FROM ticket_types
            WHERE event_id = %s
            ORDER BY ticket_type_id
            """,
            (event_id,),
        )
        tickets = cur.fetchall()
    return {
        "event": serialize_row(dict(ev)),
        "ticket_types": [serialize_row(dict(t)) for t in tickets],
    }


@app.get("/api/venues")
def list_venues() -> list[dict[str, Any]]:
    with get_cursor() as cur:
        cur.execute(
            """
            SELECT venue_id, venue_name, address, city, capacity
            FROM venues
            ORDER BY city, venue_name
            """
        )
        rows = cur.fetchall()
    return [serialize_row(dict(r)) for r in rows]


class CreateEventBody(BaseModel):
    event_name: str = Field(min_length=1, max_length=200)
    venue_id: int
    start_datetime: str
    end_datetime: str
    status: str = Field(default="pending", max_length=50)
    description: str | None = None
    category: str | None = Field(default=None, max_length=100)
    price_eur: float = Field(default=0, ge=0)
    tickets_available: int = Field(default=100, ge=0)


@app.post("/api/events")
def create_event(
    body: CreateEventBody,
    organizer_id: Annotated[int, Depends(get_current_organizer_id)],
) -> dict[str, Any]:
    if body.status not in ("pending", "ongoing", "done"):
        raise HTTPException(
            status_code=400, detail="status must be pending, ongoing, or done"
        )
    with get_cursor() as cur:
        cur.execute("SELECT venue_id FROM venues WHERE venue_id = %s", (body.venue_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Venue not found")
        try:
            cur.execute(
                """
                INSERT INTO events (
                    organizer_id, venue_id, event_name, description, category,
                    start_datetime, end_datetime, status
                )
                VALUES (%s, %s, %s, %s, %s, %s::timestamp, %s::timestamp, %s)
                RETURNING event_id, event_name, status, start_datetime, end_datetime, created_at
                """,
                (
                    organizer_id,
                    body.venue_id,
                    body.event_name.strip(),
                    body.description,
                    body.category,
                    body.start_datetime,
                    body.end_datetime,
                    body.status,
                ),
            )
            ev = cur.fetchone()
        except Exception as exc:
            msg = str(exc).lower()
            if "chk_events_end_after_start" in msg or "end_datetime" in msg:
                raise HTTPException(
                    status_code=400,
                    detail="end_datetime must be after start_datetime",
                ) from exc
            raise
        if not ev:
            raise HTTPException(status_code=500, detail="Event insert failed")
        event_id = int(ev["event_id"])
        cur.execute(
            """
            INSERT INTO ticket_types (event_id, ticket_name, price, quantity_available)
            VALUES (%s, 'Standard', %s, %s)
            RETURNING ticket_type_id, ticket_name, price, quantity_available
            """,
            (event_id, body.price_eur, body.tickets_available),
        )
        ticket_row = cur.fetchone()
    return {
        "event_id": event_id,
        "event": serialize_row(dict(ev)),
        "ticket_type": serialize_row(dict(ticket_row)) if ticket_row else None,
    }


@app.get("/api/bookings/overlap-warning")
def overlap_warning(
    event_id: int,
    user_id: Annotated[int, Depends(get_current_guest_id)],
) -> dict[str, Any]:
    with get_cursor() as cur:
        cur.execute(
            """
            SELECT start_datetime, end_datetime FROM events WHERE event_id = %s
            """,
            (event_id,),
        )
        target = cur.fetchone()
        if not target:
            raise HTTPException(status_code=404, detail="Event not found")
        new_start = target["start_datetime"]
        new_end = target["end_datetime"]
        cur.execute(
            """
            SELECT e.event_id, e.event_name, e.start_datetime, e.end_datetime
            FROM bookings b
            JOIN ticket_types tt ON tt.ticket_type_id = b.ticket_type_id
            JOIN events e ON e.event_id = tt.event_id
            JOIN payments p ON p.booking_id = b.booking_id
            WHERE b.user_id = %s
              AND b.booking_status = 'confirmed'
              AND p.payment_status = 'completed'
              AND e.event_id <> %s
              AND e.start_datetime < %s
              AND e.end_datetime > %s
            ORDER BY e.start_datetime
            """,
            (user_id, event_id, new_end, new_start),
        )
        conflicts = cur.fetchall()
    return {
        "has_overlap": len(conflicts) > 0,
        "conflicts": [serialize_row(dict(c)) for c in conflicts],
    }


class CreateBookingBody(BaseModel):
    ticket_type_id: int
    quantity: int = Field(ge=1)
    payment_method: str = Field(default="card", max_length=50)


@app.post("/api/bookings")
def create_booking(
    body: CreateBookingBody,
    user_id: Annotated[int, Depends(get_current_guest_id)],
) -> dict[str, Any]:
    with get_cursor() as cur:
        cur.execute(
            """
            SELECT tt.ticket_type_id, tt.event_id, tt.price, tt.quantity_available
            FROM ticket_types tt
            JOIN events e ON e.event_id = tt.event_id
            WHERE tt.ticket_type_id = %s
            """,
            (body.ticket_type_id,),
        )
        tt = cur.fetchone()
        if not tt:
            raise HTTPException(status_code=404, detail="Ticket type not found")
        if tt["quantity_available"] < body.quantity:
            raise HTTPException(status_code=400, detail="Not enough tickets available")

        amount = Decimal(str(tt["price"])) * body.quantity

        cur.execute(
            """
            INSERT INTO bookings (user_id, ticket_type_id, quantity, booking_status)
            VALUES (%s, %s, %s, 'confirmed')
            RETURNING booking_id, booking_date
            """,
            (user_id, body.ticket_type_id, body.quantity),
        )
        booking = cur.fetchone()
        if not booking:
            raise HTTPException(status_code=500, detail="Booking insert failed")
        booking_id = booking["booking_id"]

        cur.execute(
            """
            INSERT INTO payments (booking_id, amount, payment_method, payment_status, payment_date)
            VALUES (%s, %s, %s, 'completed', CURRENT_TIMESTAMP)
            """,
            (booking_id, amount, body.payment_method),
        )

        cur.execute(
            """
            UPDATE ticket_types
            SET quantity_available = quantity_available - %s
            WHERE ticket_type_id = %s AND quantity_available >= %s
            RETURNING quantity_available
            """,
            (body.quantity, body.ticket_type_id, body.quantity),
        )
        updated = cur.fetchone()
        if not updated:
            raise HTTPException(status_code=409, detail="Could not update inventory")

    return {
        "booking_id": booking_id,
        "amount_eur": float(amount),
        "booking": serialize_row(dict(booking)),
    }


@app.get("/api/bookings/mine")
def my_bookings(user_id: Annotated[int, Depends(get_current_guest_id)]) -> list[dict[str, Any]]:
    with get_cursor() as cur:
        cur.execute(
            """
            SELECT
                b.booking_id,
                b.quantity,
                b.booking_status,
                b.booking_date,
                e.event_id,
                e.event_name,
                e.start_datetime,
                tt.ticket_name,
                tt.price,
                p.payment_status
            FROM bookings b
            JOIN ticket_types tt ON tt.ticket_type_id = b.ticket_type_id
            JOIN events e ON e.event_id = tt.event_id
            LEFT JOIN payments p ON p.booking_id = b.booking_id
            WHERE b.user_id = %s
            ORDER BY b.booking_date DESC
            """,
            (user_id,),
        )
        rows = cur.fetchall()
    return [serialize_row(dict(r)) for r in rows]


@app.post("/api/bookings/{booking_id}/cancel")
def cancel_booking(
    booking_id: int,
    user_id: Annotated[int, Depends(get_current_guest_id)],
) -> dict[str, Any]:
    with get_cursor() as cur:
        cur.execute(
            """
            SELECT b.booking_id, b.user_id, b.quantity, b.booking_status, b.ticket_type_id
            FROM bookings b
            WHERE b.booking_id = %s
            """,
            (booking_id,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Booking not found")
        if int(row["user_id"]) != user_id:
            raise HTTPException(status_code=403, detail="Not your booking")
        if row["booking_status"] == "cancelled":
            raise HTTPException(status_code=400, detail="Booking already cancelled")
        cur.execute(
            "SELECT 1 FROM check_ins WHERE booking_id = %s",
            (booking_id,),
        )
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Cannot cancel after check-in")
        cur.execute(
            """
            UPDATE bookings SET booking_status = 'cancelled'
            WHERE booking_id = %s
            RETURNING booking_id, booking_status
            """,
            (booking_id,),
        )
        updated = cur.fetchone()
        cur.execute(
            """
            UPDATE ticket_types
            SET quantity_available = quantity_available + %s
            WHERE ticket_type_id = %s
            """,
            (row["quantity"], row["ticket_type_id"]),
        )
    if not updated:
        raise HTTPException(status_code=500, detail="Cancel failed")
    return serialize_row(dict(updated))


@app.get("/api/events/{event_id}/bookings")
def event_bookings(
    event_id: int,
    organizer_id: Annotated[int, Depends(get_current_organizer_id)],
) -> list[dict[str, Any]]:
    with get_cursor() as cur:
        cur.execute(
            "SELECT organizer_id FROM events WHERE event_id = %s",
            (event_id,),
        )
        ev = cur.fetchone()
        if not ev:
            raise HTTPException(status_code=404, detail="Event not found")
        if int(ev["organizer_id"]) != organizer_id:
            raise HTTPException(status_code=403, detail="Not your event")
        cur.execute(
            """
            SELECT
                b.booking_id,
                b.user_id,
                u.username,
                u.full_name,
                tt.ticket_name,
                b.quantity,
                b.booking_status,
                p.payment_status,
                (c.check_in_id IS NOT NULL) AS checked_in,
                c.check_in_time
            FROM ticket_types tt
            JOIN bookings b ON b.ticket_type_id = tt.ticket_type_id
            JOIN users u ON u.user_id = b.user_id
            LEFT JOIN payments p ON p.booking_id = b.booking_id
            LEFT JOIN check_ins c ON c.booking_id = b.booking_id
            WHERE tt.event_id = %s
            ORDER BY b.booking_id
            """,
            (event_id,),
        )
        rows = cur.fetchall()
    return [serialize_row(dict(r)) for r in rows]


class CheckInBody(BaseModel):
    booking_id: int


@app.post("/api/check-ins")
def create_check_in(
    body: CheckInBody,
    organizer_id: Annotated[int, Depends(get_current_organizer_id)],
) -> dict[str, Any]:
    with get_cursor() as cur:
        cur.execute(
            """
            SELECT e.organizer_id
            FROM bookings b
            JOIN ticket_types tt ON tt.ticket_type_id = b.ticket_type_id
            JOIN events e ON e.event_id = tt.event_id
            WHERE b.booking_id = %s
            """,
            (body.booking_id,),
        )
        booking_ev = cur.fetchone()
        if not booking_ev:
            raise HTTPException(status_code=404, detail="Booking not found")
        if int(booking_ev["organizer_id"]) != organizer_id:
            raise HTTPException(status_code=403, detail="Not your event")
        cur.execute(
            """
            SELECT booking_id FROM check_ins WHERE booking_id = %s
            """,
            (body.booking_id,),
        )
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Already checked in")
        cur.execute(
            """
            INSERT INTO check_ins (booking_id, check_in_time, checked_in_by)
            VALUES (%s, CURRENT_TIMESTAMP, %s)
            RETURNING check_in_id, check_in_time
            """,
            (body.booking_id, organizer_id),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=500, detail="Check-in failed")
    return serialize_row(dict(row))


@app.get("/api/analytics/attendees-per-event")
def analytics_attendees_per_event(
    organizer_id: Annotated[int, Depends(get_current_organizer_id)],
) -> list[dict[str, Any]]:
    with get_cursor() as cur:
        cur.execute(
            """
            SELECT
                e.event_id,
                e.event_name,
                COALESCE(
                    SUM(
                        CASE
                            WHEN b.booking_status = 'confirmed'
                                 AND p.payment_status = 'completed'
                            THEN b.quantity
                        END
                    ),
                    0
                )::bigint AS total_attendees
            FROM events e
            LEFT JOIN ticket_types tt ON tt.event_id = e.event_id
            LEFT JOIN bookings b ON b.ticket_type_id = tt.ticket_type_id
            LEFT JOIN payments p ON p.booking_id = b.booking_id
            WHERE e.organizer_id = %s
            GROUP BY e.event_id, e.event_name
            ORDER BY e.event_id
            """,
            (organizer_id,),
        )
        rows = cur.fetchall()
    return [serialize_row(dict(r)) for r in rows]


@app.get("/api/analytics/revenue-per-organizer")
def analytics_revenue_per_organizer(
    organizer_id: Annotated[int, Depends(get_current_organizer_id)],
) -> list[dict[str, Any]]:
    with get_cursor() as cur:
        cur.execute(
            """
            SELECT
                o.organizer_id,
                o.organizer_name,
                COALESCE(
                    SUM(CASE WHEN p.payment_status = 'completed' THEN p.amount END),
                    0
                ) AS total_revenue_eur
            FROM organizers o
            LEFT JOIN events e ON e.organizer_id = o.organizer_id
            LEFT JOIN ticket_types tt ON tt.event_id = e.event_id
            LEFT JOIN bookings b ON b.ticket_type_id = tt.ticket_type_id
            LEFT JOIN payments p ON p.booking_id = b.booking_id
            WHERE o.organizer_id = %s
            GROUP BY o.organizer_id, o.organizer_name
            ORDER BY o.organizer_id
            """,
            (organizer_id,),
        )
        rows = cur.fetchall()
    return [serialize_row(dict(r)) for r in rows]


@app.get("/api/analytics/attendance-rate-last-3-months")
def analytics_attendance_rate(
    organizer_id: Annotated[int, Depends(get_current_organizer_id)],
) -> dict[str, Any]:
    with get_cursor() as cur:
        cur.execute(
            """
            WITH ev AS (
                SELECT event_id
                FROM events
                WHERE end_datetime >= (CURRENT_TIMESTAMP - INTERVAL '3 months')
                  AND end_datetime < CURRENT_TIMESTAMP
                  AND status = 'done'
                  AND organizer_id = %s
            ),
            sold AS (
                SELECT COALESCE(SUM(b.quantity), 0)::numeric AS tickets_sold
                FROM bookings b
                JOIN ticket_types tt ON tt.ticket_type_id = b.ticket_type_id
                JOIN payments p ON p.booking_id = b.booking_id
                WHERE p.payment_status = 'completed'
                  AND tt.event_id IN (SELECT event_id FROM ev)
            ),
            checked AS (
                SELECT COUNT(*)::numeric AS check_in_count
                FROM check_ins c
                JOIN bookings b ON b.booking_id = c.booking_id
                JOIN ticket_types tt ON tt.ticket_type_id = b.ticket_type_id
                JOIN payments p ON p.booking_id = b.booking_id
                WHERE p.payment_status = 'completed'
                  AND tt.event_id IN (SELECT event_id FROM ev)
            )
            SELECT
                (SELECT tickets_sold FROM sold) AS tickets_sold,
                (SELECT check_in_count FROM checked) AS check_ins_recorded,
                CASE
                    WHEN (SELECT tickets_sold FROM sold) = 0 THEN NULL
                    ELSE (SELECT check_in_count FROM checked)
                         / (SELECT tickets_sold FROM sold)
                END AS avg_attendance_rate
            """,
            (organizer_id,),
        )
        row = cur.fetchone()
    if not row:
        return {"tickets_sold": 0, "check_ins_recorded": 0, "avg_attendance_rate": None}
    return serialize_row(dict(row))


# Production: serve Vite build copied to backend/static (see docs/DEPLOY.md)
_STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
if _STATIC_DIR.is_dir():
    _assets = _STATIC_DIR / "assets"
    if _assets.is_dir():
        app.mount("/assets", StaticFiles(directory=_assets), name="assets")

    @app.get("/{spa_path:path}")
    def spa_fallback(spa_path: str) -> FileResponse:
        if spa_path == "api" or spa_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        candidate = _STATIC_DIR / spa_path
        if spa_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_STATIC_DIR / "index.html")
