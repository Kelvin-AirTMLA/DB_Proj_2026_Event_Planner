import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import AuthGate, { type SessionAccount } from "./AuthGate";
import { apiGet, apiPost, clearAuthToken, getAuthToken } from "./api";

type MainTab = "events" | "detail" | "analytics" | "checkin" | "create" | "bookings";

type VenueRow = {
  venue_id: number;
  venue_name: string;
  address: string;
  city: string;
  capacity: number;
};

function parseMainPath(pathname: string): { tab: MainTab; eventId: number | null } {
  if (pathname === "/analytics") return { tab: "analytics", eventId: null };
  if (pathname === "/check-in") return { tab: "checkin", eventId: null };
  if (pathname === "/create-event") return { tab: "create", eventId: null };
  if (pathname === "/my-bookings") return { tab: "bookings", eventId: null };
  const m = /^\/events\/(\d+)$/.exec(pathname);
  if (m) return { tab: "detail", eventId: Number(m[1]) };
  return { tab: "events", eventId: null };
}

type EventRow = {
  event_id: number;
  event_name: string;
  category: string | null;
  status: string;
  start_datetime: string;
  end_datetime: string;
  venue_name: string;
  city: string;
  organizer_name: string;
};

type TicketType = {
  ticket_type_id: number;
  ticket_name: string;
  price: number;
  quantity_available: number;
};

type EventDetail = {
  event: EventRow & {
    organizer_id: number;
    venue_id: number;
    description: string | null;
    address: string;
    capacity: number;
  };
  ticket_types: TicketType[];
};

type ExistingEventBooking = {
  ticket_name: string;
  quantity: number;
  booking_date: string;
  booking_status: string;
  payment_status: string | null;
};

type BookingPrecheckResponse = {
  has_overlap: boolean;
  conflicts: { event_id: number; event_name: string; start_datetime: string; end_datetime: string }[];
  already_booked_this_event: boolean;
  existing_booking: ExistingEventBooking | null;
};

type BookingKey = {
  user_id: number;
  ticket_type_id: number;
  booking_date: string;
};

function bookingRowKey(b: BookingKey) {
  return `${b.user_id}-${b.ticket_type_id}-${b.booking_date}`;
}

function formatDt(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

type BookingRow = BookingKey & {
  username: string;
  full_name: string;
  ticket_name: string;
  quantity: number;
  booking_status: string;
  payment_status: string | null;
  checked_in: boolean;
  check_in_time: string | null;
};

function AlreadyBookedModal({
  open,
  onClose,
  eventName,
  booking,
}: {
  open: boolean;
  onClose: () => void;
  eventName: string;
  booking: ExistingEventBooking | null;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="already-booked-title"
        aria-describedby="already-booked-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="already-booked-title">Already booked</h3>
        <p id="already-booked-desc">
          You already have a booking for <strong>{eventName}</strong>. This MVP allows only one
          booking per guest per event.
        </p>
        {booking && (
          <p className="muted" style={{ marginBottom: 0 }}>
            {booking.ticket_name} · qty {booking.quantity} · booked {formatDt(booking.booking_date)} ·{" "}
            {booking.booking_status}
            {booking.payment_status ? ` · payment ${booking.payment_status}` : ""}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="primary" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function RefundWarningModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="refund-warning-title"
        aria-describedby="refund-warning-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="refund-warning-title">Confirm booking</h3>
        <p id="refund-warning-desc">
          All ticket sales are <strong>final</strong>. This MVP does not offer refunds, cancellations,
          or chargebacks after payment is completed.
        </p>
        <p className="muted" style={{ marginBottom: 0 }}>
          By continuing, you agree to pay for this booking with no option to reverse it in the app.
        </p>
        <div className="modal-actions">
          <button type="button" className="ghost" onClick={onClose}>
            Go back
          </button>
          <button type="button" className="primary" onClick={onConfirm}>
            I understand — complete booking
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function MainShell({ session, onLogout }: { session: SessionAccount; onLogout: () => void }) {
  const isGuest = session.role === "guest";
  const isOrganizer = session.role === "organizer";
  const navigate = useNavigate();
  const location = useLocation();
  const { tab, eventId: urlEventId } = parseMainPath(location.pathname);

  /** Remember last `/events/:id` so "Event & book" works from Browse (URL `/events` has no id). */
  const [lastOpenedEventId, setLastOpenedEventId] = useState<number | null>(null);
  useEffect(() => {
    if (urlEventId != null) setLastOpenedEventId(urlEventId);
  }, [urlEventId]);
  const bookingNavTargetId = urlEventId ?? lastOpenedEventId;

  useEffect(() => {
    const p = location.pathname;
    if (p === "/" || p === "") {
      navigate(isGuest ? "/events" : "/analytics", { replace: true });
      return;
    }
    const validGuest = p === "/events" || p === "/my-bookings" || /^\/events\/\d+$/.test(p);
    const validOrganizer = p === "/events" || p === "/analytics" || p === "/check-in" || p === "/create-event";
    if (isGuest && !validGuest) navigate("/events", { replace: true });
    if (isOrganizer && !validOrganizer) navigate("/analytics", { replace: true });
    if (isOrganizer && /^\/events\/\d+$/.test(p)) navigate("/events", { replace: true });
  }, [location.pathname, navigate, isGuest, isOrganizer]);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [startFrom, setStartFrom] = useState("");
  const [startTo, setStartTo] = useState("");

  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [ticketTypeId, setTicketTypeId] = useState<number | "">("");
  const [quantityText, setQuantityText] = useState("1");
  const [bookingPrecheck, setBookingPrecheck] = useState<BookingPrecheckResponse | null>(null);
  const [alreadyBookedModalOpen, setAlreadyBookedModalOpen] = useState(false);
  /** Newest first; each booking adds a line so earlier confirmations are not replaced. */
  const [bookingSuccessLines, setBookingSuccessLines] = useState<string[]>([]);
  const [bookError, setBookError] = useState<string | null>(null);
  const [refundWarningOpen, setRefundWarningOpen] = useState(false);

  const [checkEventId, setCheckEventId] = useState<number | "">("");
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [checkinError, setCheckinError] = useState<string | null>(null);

  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [eventName, setEventName] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventCategory, setEventCategory] = useState("");
  const [venueId, setVenueId] = useState<number | "">("");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");
  const [eventStatus, setEventStatus] = useState("pending");
  const [eventPrice, setEventPrice] = useState(15);
  const [eventTickets, setEventTickets] = useState(100);

  type MyBookingRow = BookingKey & {
    quantity: number;
    booking_status: string;
    event_id: number;
    event_name: string;
    start_datetime: string;
    ticket_name: string;
    price: number;
    payment_status: string | null;
  };
  const [myBookings, setMyBookings] = useState<MyBookingRow[]>([]);
  const [myBookingsError, setMyBookingsError] = useState<string | null>(null);

  const [attendees, setAttendees] = useState<{ event_id: number; event_name: string; total_attendees: number }[]>(
    [],
  );
  const [revenue, setRevenue] = useState<
    { organizer_id: number; organizer_name: string; total_revenue_eur: number }[]
  >([]);
  const [attRate, setAttRate] = useState<{
    tickets_sold: number;
    check_ins_recorded: number;
    avg_attendance_rate: number | null;
  } | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  useEffect(() => {
    setBookingSuccessLines([]);
    setRefundWarningOpen(false);
  }, [urlEventId]);

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    setEventsError(null);
    try {
      const params = new URLSearchParams();
      if (isOrganizer) params.set("organizer_id", String(session.organizer_id));
      if (startFrom) params.set("start_from", startFrom);
      if (startTo) params.set("start_to", startTo);
      const q = params.toString();
      const path = q ? `/api/events?${q}` : "/api/events";
      const data = await apiGet<EventRow[]>(path);
      setEvents(data);
    } catch (e) {
      setEventsError(e instanceof Error ? e.message : "Failed to load events");
    } finally {
      setLoadingEvents(false);
    }
  }, [startFrom, startTo, isOrganizer, session]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (tab !== "detail" || !urlEventId) {
      setDetail(null);
      setDetailError(null);
      return;
    }
    let cancelled = false;
    setDetail(null);
    setDetailError(null);
    setBookingPrecheck(null);
    setBookError(null);
    setTicketTypeId("");
    void (async () => {
      try {
        const d = await apiGet<EventDetail>(`/api/events/${urlEventId}`);
        if (cancelled) return;
        setDetail(d);
        if (d.ticket_types.length > 0) setTicketTypeId(d.ticket_types[0].ticket_type_id);
      } catch (e) {
        if (!cancelled) setDetailError(e instanceof Error ? e.message : "Failed to load event");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, urlEventId]);

  const loadBookingPrecheck = useCallback(async (eventId: number) => {
    try {
      const o = await apiGet<BookingPrecheckResponse>(`/api/bookings/overlap-warning?event_id=${eventId}`);
      setBookingPrecheck(o);
    } catch {
      setBookingPrecheck(null);
    }
  }, []);

  useEffect(() => {
    if (tab !== "detail" || !urlEventId || !isGuest) {
      setBookingPrecheck(null);
      return;
    }
    void loadBookingPrecheck(urlEventId);
  }, [tab, urlEventId, isGuest, loadBookingPrecheck]);

  const requestBooking = () => {
    setBookError(null);
    if (ticketTypeId === "") {
      setBookError("Choose a ticket type.");
      return;
    }
    if (bookingPrecheck?.already_booked_this_event) {
      setAlreadyBookedModalOpen(true);
      return;
    }
    setRefundWarningOpen(true);
  };

  const bookingQuantity = (): number | null => {
    const n = parseInt(quantityText.trim(), 10);
    if (!Number.isFinite(n) || n < 1) return null;
    return n;
  };

  const submitBooking = async () => {
    setRefundWarningOpen(false);
    setBookError(null);
    if (ticketTypeId === "") {
      setBookError("Choose a ticket type.");
      return;
    }
    const quantity = bookingQuantity();
    if (quantity === null) {
      setBookError("Enter a valid quantity (1 or more).");
      return;
    }
    const bookedTicketTypeId = ticketTypeId;
    try {
      const res = await apiPost<{
        amount_eur: number;
        booking: { booking_date: string };
      }>("/api/bookings", {
        ticket_type_id: ticketTypeId,
        quantity,
        payment_method: "card",
      });
      const line = `Booking confirmed (${formatDt(res.booking.booking_date)}) — €${res.amount_eur.toFixed(2)}.`;
      setBookingSuccessLines((prev) => [line, ...prev].slice(0, 12));
      if (urlEventId) {
        try {
          const d = await apiGet<EventDetail>(`/api/events/${urlEventId}`);
          setDetail(d);
          if (d.ticket_types.length > 0) {
            const stillThere =
              typeof bookedTicketTypeId === "number" &&
              d.ticket_types.some((t) => t.ticket_type_id === bookedTicketTypeId);
            setTicketTypeId(stillThere ? bookedTicketTypeId : d.ticket_types[0].ticket_type_id);
          }
        } catch {
          /* ignore refresh failure */
        }
      }
      void loadEvents();
      if (urlEventId) void loadBookingPrecheck(urlEventId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Booking failed";
      if (msg.toLowerCase().includes("already have a booking")) {
        setAlreadyBookedModalOpen(true);
        if (urlEventId) void loadBookingPrecheck(urlEventId);
      } else {
        setBookError(msg);
      }
    }
  };

  const loadAnalytics = async () => {
    setAnalyticsError(null);
    try {
      const [a, r, ar] = await Promise.all([
        apiGet<typeof attendees>("/api/analytics/attendees-per-event"),
        apiGet<typeof revenue>("/api/analytics/revenue-per-organizer"),
        apiGet<typeof attRate>("/api/analytics/attendance-rate-last-3-months"),
      ]);
      setAttendees(a);
      setRevenue(r);
      setAttRate(ar);
    } catch (e) {
      setAnalyticsError(e instanceof Error ? e.message : "Analytics failed");
    }
  };

  useEffect(() => {
    if (tab === "analytics" && isOrganizer) void loadAnalytics();
  }, [tab, isOrganizer]);

  const loadCheckins = async () => {
    setCheckinError(null);
    if (checkEventId === "") {
      setBookings([]);
      return;
    }
    try {
      const b = await apiGet<BookingRow[]>(`/api/events/${checkEventId}/bookings`);
      setBookings(b);
    } catch (e) {
      setCheckinError(e instanceof Error ? e.message : "Failed to load bookings");
    }
  };

  useEffect(() => {
    if (tab === "checkin") void loadCheckins();
  }, [tab, checkEventId]);

  useEffect(() => {
    if (tab !== "create" || !isOrganizer) return;
    setCreateError(null);
    void apiGet<VenueRow[]>("/api/venues")
      .then((v) => {
        setVenues(v);
        if (v.length > 0 && venueId === "") setVenueId(v[0].venue_id);
      })
      .catch((e) => setCreateError(e instanceof Error ? e.message : "Failed to load venues"));
  }, [tab, isOrganizer]);

  const submitCreateEvent = async () => {
    setCreateError(null);
    setCreateSuccess(null);
    if (!eventName.trim()) {
      setCreateError("Event name is required.");
      return;
    }
    if (venueId === "") {
      setCreateError("Choose a venue.");
      return;
    }
    if (!eventStart || !eventEnd) {
      setCreateError("Start and end date/time are required.");
      return;
    }
    try {
      const res = await apiPost<{ event_id: number; event: { event_name: string } }>("/api/events", {
        event_name: eventName.trim(),
        description: eventDescription.trim() || null,
        category: eventCategory.trim() || null,
        venue_id: venueId,
        start_datetime: eventStart,
        end_datetime: eventEnd,
        status: eventStatus,
        price_eur: eventPrice,
        tickets_available: eventTickets,
      });
      setCreateSuccess(`Created “${res.event.event_name}” (event #${res.event_id}).`);
      void loadEvents();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Could not create event");
    }
  };

  const loadMyBookings = async () => {
    setMyBookingsError(null);
    try {
      const rows = await apiGet<MyBookingRow[]>("/api/bookings/mine");
      setMyBookings(rows);
    } catch (e) {
      setMyBookingsError(e instanceof Error ? e.message : "Failed to load bookings");
    }
  };

  useEffect(() => {
    if (tab === "bookings" && isGuest) void loadMyBookings();
  }, [tab, isGuest]);

  const doCheckIn = async (b: BookingRow) => {
    setCheckinError(null);
    try {
      await apiPost("/api/check-ins", {
        user_id: b.user_id,
        ticket_type_id: b.ticket_type_id,
        booking_date: b.booking_date,
      });
      await loadCheckins();
    } catch (e) {
      setCheckinError(e instanceof Error ? e.message : "Check-in failed");
    }
  };

  const presetRange = (key: "week" | "month" | "clear") => {
    const now = new Date();
    if (key === "clear") {
      setStartFrom("");
      setStartTo("");
      return;
    }
    const from = new Date(now);
    if (key === "week") {
      const to = new Date(now);
      to.setDate(to.getDate() + 7);
      setStartFrom(from.toISOString().slice(0, 16));
      setStartTo(to.toISOString().slice(0, 16));
    } else {
      from.setMonth(from.getMonth() - 1);
      const to = new Date(now);
      to.setMonth(to.getMonth() + 3);
      setStartFrom(from.toISOString().slice(0, 16));
      setStartTo(to.toISOString().slice(0, 16));
    }
  };

  const eventOptions = useMemo(
    () =>
      events.map((e) => (
        <option key={e.event_id} value={e.event_id}>
          {e.event_name} — {formatDt(e.start_datetime)}
        </option>
      )),
    [events],
  );

  return (
    <div className="app-shell">
      <header>
        <div>
          <h1>Event Management — course MVP</h1>
          <p className="muted" style={{ margin: "0.25rem 0 0" }}>
            {isGuest ? (
              <>
                Guest: <strong>{session.username}</strong> ({session.email})
              </>
            ) : (
              <>
                Organizer: <strong>{session.username}</strong> — {session.organizer_name} ({session.email})
              </>
            )}
          </p>
        </div>
        <nav>
          {(isGuest || isOrganizer) && (
            <button type="button" className={tab === "events" ? "active" : ""} onClick={() => navigate("/events")}>
              Browse
            </button>
          )}
          {isGuest && (
            <button type="button" className={tab === "bookings" ? "active" : ""} onClick={() => navigate("/my-bookings")}>
              My bookings
            </button>
          )}
          {isGuest && (
            <button
              type="button"
              className={tab === "detail" ? "active" : ""}
              title={
                bookingNavTargetId
                  ? "Open this event’s detail and booking form"
                  : "Pick an event under Browse first, then you can return here from any tab"
              }
              onClick={() => bookingNavTargetId && navigate(`/events/${bookingNavTargetId}`)}
              disabled={!bookingNavTargetId}
            >
              Event &amp; book
            </button>
          )}
          {isOrganizer && (
            <button type="button" className={tab === "create" ? "active" : ""} onClick={() => navigate("/create-event")}>
              Create event
            </button>
          )}
          {isOrganizer && (
            <button type="button" className={tab === "analytics" ? "active" : ""} onClick={() => navigate("/analytics")}>
              My stats
            </button>
          )}
          {isOrganizer && (
            <button type="button" className={tab === "checkin" ? "active" : ""} onClick={() => navigate("/check-in")}>
              Check-in
            </button>
          )}
          <button type="button" className="ghost" onClick={() => onLogout()}>
            Log out
          </button>
        </nav>
      </header>

      {tab === "events" && (
        <>
          <div className="panel">
            <h2>Filters (start time)</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Uses <code>events.start_datetime</code> per spec. Datetime-local values are sent as typed.
            </p>
            <div className="row">
              <label>
                From
                <input type="datetime-local" value={startFrom} onChange={(e) => setStartFrom(e.target.value)} />
              </label>
              <label>
                To (exclusive)
                <input type="datetime-local" value={startTo} onChange={(e) => setStartTo(e.target.value)} />
              </label>
              <button type="button" className="ghost" onClick={() => presetRange("week")}>
                Next ~7 days
              </button>
              <button type="button" className="ghost" onClick={() => presetRange("month")}>
                Wide window
              </button>
              <button type="button" className="ghost" onClick={() => presetRange("clear")}>
                Clear
              </button>
              <button type="button" className="primary" onClick={() => void loadEvents()} disabled={loadingEvents}>
                Apply
              </button>
            </div>
            {eventsError && <p className="error">{eventsError}</p>}
          </div>
          <div className="panel">
            <h2>Events</h2>
            {events.length === 0 && !eventsError ? (
              <p className="muted">No events match. Clear filters or load seed data.</p>
            ) : (
              events.map((e) => (
                <div key={e.event_id} className="event-card">
                  <h3>{e.event_name}</h3>
                  <div>
                    <span className={`pill ${e.status}`}>{e.status}</span>
                    {e.category && <span className="pill">{e.category}</span>}
                  </div>
                  <p className="muted" style={{ margin: "0.4rem 0" }}>
                    {formatDt(e.start_datetime)} — {e.venue_name}, {e.city} · {e.organizer_name}
                  </p>
                  {isGuest && (
                    <button type="button" className="primary" onClick={() => navigate(`/events/${e.event_id}`)}>
                      View &amp; book
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {tab === "detail" && isGuest && (
        <div className="panel">
          <h2>Event detail &amp; booking</h2>
          {detailError && <p className="error">{detailError}</p>}
          {!detail && !detailError && <p className="muted">Loading…</p>}
          {detail && (
            <>
              <p style={{ marginTop: 0 }}>
                <strong>{detail.event.event_name}</strong>{" "}
                <span className={`pill ${detail.event.status}`}>{detail.event.status}</span>
              </p>
              <p className="muted">{detail.event.description}</p>
              <p className="muted">
                {formatDt(detail.event.start_datetime)} → {formatDt(detail.event.end_datetime)}
                <br />
                {detail.event.venue_name}, {detail.event.address}, {detail.event.city} (capacity{" "}
                {detail.event.capacity})
              </p>

              <h3 style={{ fontSize: "0.95rem", marginBottom: "0.35rem" }}>Ticket types</h3>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Price (EUR)</th>
                    <th>Available</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.ticket_types.map((t) => (
                    <tr key={t.ticket_type_id}>
                      <td>{t.ticket_name}</td>
                      <td>{t.price.toFixed(2)}</td>
                      <td>{t.quantity_available}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3 style={{ fontSize: "0.95rem", margin: "1rem 0 0.35rem" }}>Book as you</h3>
              <p className="muted">Bookings are tied to your authenticated account.</p>
              <div className="row">
                <label>
                  Ticket
                  <select
                    value={ticketTypeId === "" ? "" : String(ticketTypeId)}
                    onChange={(e) => setTicketTypeId(e.target.value ? Number(e.target.value) : "")}
                  >
                    {detail.ticket_types.map((t) => (
                      <option key={t.ticket_type_id} value={t.ticket_type_id}>
                        {t.ticket_name} (€{t.price.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Quantity
                  <input
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={quantityText}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "" || /^\d+$/.test(raw)) setQuantityText(raw);
                    }}
                    onBlur={() => {
                      const n = bookingQuantity();
                      setQuantityText(n === null ? "1" : String(n));
                    }}
                  />
                </label>
              </div>
              {bookingPrecheck?.already_booked_this_event && (
                <div className="warn-banner">
                  <strong>You already booked this event.</strong> One booking per guest per event in this MVP.
                  {bookingPrecheck.existing_booking && (
                    <>
                      {" "}
                      ({bookingPrecheck.existing_booking.ticket_name}, qty{" "}
                      {bookingPrecheck.existing_booking.quantity},{" "}
                      {formatDt(bookingPrecheck.existing_booking.booking_date)})
                    </>
                  )}
                </div>
              )}
              {bookingPrecheck?.has_overlap && !bookingPrecheck.already_booked_this_event && (
                <div className="warn-banner">
                  <strong>Overlap notice (non-blocking):</strong> this user already has a paid booking overlapping
                  this time window:{" "}
                  {bookingPrecheck.conflicts.map((c) => c.event_name).join(", ")}
                </div>
              )}
              {bookError && <p className="error">{bookError}</p>}
              {bookingSuccessLines.length > 0 && (
                <ul className="booking-success-list">
                  {bookingSuccessLines.map((line, i) => (
                    <li key={`${i}-${line.slice(0, 24)}`}>{line}</li>
                  ))}
                </ul>
              )}
              <button type="button" className="primary" onClick={requestBooking}>
                {bookingPrecheck?.already_booked_this_event
                  ? "Already booked — view notice"
                  : "Create booking + completed payment"}
              </button>
            </>
          )}
        </div>
      )}

      <AlreadyBookedModal
        open={alreadyBookedModalOpen && tab === "detail" && isGuest}
        onClose={() => setAlreadyBookedModalOpen(false)}
        eventName={detail?.event.event_name ?? "this event"}
        booking={bookingPrecheck?.existing_booking ?? null}
      />

      <RefundWarningModal
        open={refundWarningOpen && tab === "detail" && isGuest}
        onClose={() => setRefundWarningOpen(false)}
        onConfirm={() => void submitBooking()}
      />

      {tab === "analytics" && isOrganizer && (
        <div className="panel">
          <h2>My stats</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Your events only. System-wide course reports are in <code>queries/*.sql</code>.
          </p>
          <button type="button" className="ghost" style={{ marginBottom: "1rem" }} onClick={() => void loadAnalytics()}>
            Refresh
          </button>
          {analyticsError && <p className="error">{analyticsError}</p>}

          <h3 style={{ fontSize: "0.95rem" }}>1 — Attendees per event (yours)</h3>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Event</th>
                <th>Total attendees (qty)</th>
              </tr>
            </thead>
            <tbody>
              {attendees.map((r) => (
                <tr key={r.event_id}>
                  <td>{r.event_id}</td>
                  <td>{r.event_name}</td>
                  <td>{r.total_attendees}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ fontSize: "0.95rem", marginTop: "1.25rem" }}>2 — Your ticket revenue (EUR)</h3>
          {revenue.length > 0 ? (
            <p>
              <strong>{revenue[0].organizer_name}</strong>: €{revenue[0].total_revenue_eur.toFixed(2)} from completed
              payments on your events.
            </p>
          ) : (
            <p className="muted">No revenue recorded yet.</p>
          )}

          <h3 style={{ fontSize: "0.95rem", marginTop: "1.25rem" }}>
            3 — Attendance rate (your ended events, last 3 months)
          </h3>
          {attRate && (
            <p className="muted">
              Tickets sold (denominator): {attRate.tickets_sold}. Check-in rows (numerator):{" "}
              {attRate.check_ins_recorded}. Rate:{" "}
              {attRate.avg_attendance_rate == null ? "n/a" : `${(attRate.avg_attendance_rate * 100).toFixed(1)}%`}
            </p>
          )}
        </div>
      )}

      {tab === "create" && isOrganizer && (
        <div className="panel">
          <h2>Create event</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Creates an <code>events</code> row plus one default <code>Standard</code> ticket (price and capacity below).
          </p>
          {createError && <p className="error">{createError}</p>}
          {createSuccess && <p style={{ color: "var(--ok)" }}>{createSuccess}</p>}
          <div className="row">
            <label style={{ flex: "1 1 200px" }}>
              Event name
              <input value={eventName} onChange={(e) => setEventName(e.target.value)} required />
            </label>
            <label>
              Category
              <input value={eventCategory} onChange={(e) => setEventCategory(e.target.value)} placeholder="workshop" />
            </label>
          </div>
          <label>
            Description
            <input value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} />
          </label>
          <div className="row">
            <label style={{ flex: "1 1 240px" }}>
              Venue
              <select
                value={venueId === "" ? "" : String(venueId)}
                onChange={(e) => setVenueId(e.target.value ? Number(e.target.value) : "")}
              >
                {venues.length === 0 && <option value="">Loading venues…</option>}
                {venues.map((v) => (
                  <option key={v.venue_id} value={v.venue_id}>
                    {v.venue_name}, {v.city} (cap. {v.capacity})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select value={eventStatus} onChange={(e) => setEventStatus(e.target.value)}>
                <option value="pending">pending</option>
                <option value="ongoing">ongoing</option>
                <option value="done">done</option>
              </select>
            </label>
          </div>
          <div className="row">
            <label>
              Starts
              <input type="datetime-local" value={eventStart} onChange={(e) => setEventStart(e.target.value)} required />
            </label>
            <label>
              Ends
              <input type="datetime-local" value={eventEnd} onChange={(e) => setEventEnd(e.target.value)} required />
            </label>
          </div>
          <div className="row">
            <label>
              Ticket price (EUR)
              <input
                type="number"
                min={0}
                step={0.01}
                value={eventPrice}
                onChange={(e) => setEventPrice(Number(e.target.value))}
              />
            </label>
            <label>
              Tickets available
              <input
                type="number"
                min={0}
                value={eventTickets}
                onChange={(e) => setEventTickets(Math.max(0, Number(e.target.value) || 0))}
              />
            </label>
          </div>
          <button type="button" className="primary" onClick={() => void submitCreateEvent()}>
            Create event
          </button>
        </div>
      )}

      {tab === "bookings" && isGuest && (
        <div className="panel">
          <h2>My bookings</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            View your reservations. All sales are final — no refunds or cancellations in this MVP.
          </p>
          <button type="button" className="ghost" style={{ marginBottom: "1rem" }} onClick={() => void loadMyBookings()}>
            Refresh
          </button>
          {myBookingsError && <p className="error">{myBookingsError}</p>}
          <table>
            <thead>
              <tr>
                <th>Booked</th>
                <th>Event</th>
                <th>Qty</th>
                <th>Status</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {myBookings.map((b) => (
                <tr key={bookingRowKey(b)}>
                  <td>{formatDt(b.booking_date)}</td>
                  <td>
                    {b.event_name}
                    <br />
                    <span className="muted">{formatDt(b.start_datetime)}</span>
                  </td>
                  <td>{b.quantity}</td>
                  <td>{b.booking_status}</td>
                  <td>{b.payment_status ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "checkin" && isOrganizer && (
        <div className="panel">
          <h2>Door check-in</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Check guests in at the door for one of your events.
          </p>
          <div className="row">
            <label>
              Your event
              <select
                value={checkEventId === "" ? "" : String(checkEventId)}
                onChange={(e) => setCheckEventId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">Select…</option>
                {eventOptions}
              </select>
            </label>
            <button type="button" className="ghost" onClick={() => void loadCheckins()}>
              Reload list
            </button>
          </div>
          {checkinError && <p className="error">{checkinError}</p>}
          <table>
            <thead>
              <tr>
                <th>Booked</th>
                <th>Guest</th>
                <th>Ticket</th>
                <th>Qty</th>
                <th>Payment</th>
                <th>Checked in</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={bookingRowKey(b)}>
                  <td>{formatDt(b.booking_date)}</td>
                  <td>
                    {b.username}
                    <br />
                    <span className="muted">{b.full_name}</span>
                  </td>
                  <td>{b.ticket_name}</td>
                  <td>{b.quantity}</td>
                  <td>{b.payment_status ?? "—"}</td>
                  <td>{b.checked_in ? formatDt(b.check_in_time!) : "—"}</td>
                  <td>
                    <button
                      type="button"
                      className="primary"
                      disabled={b.checked_in}
                      onClick={() => void doCheckIn(b)}
                    >
                      Check in
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type MeGuest = { role: "guest"; user: Omit<SessionAccount & { role: "guest" }, "role"> };
type MeOrganizer = { role: "organizer"; organizer: Omit<SessionAccount & { role: "organizer" }, "role"> };

function homeFor(account: SessionAccount) {
  return account.role === "guest" ? "/events" : "/analytics";
}

function MainShellWithNav({
  session,
  onLogout,
}: {
  session: SessionAccount;
  onLogout: () => void;
}) {
  const navigate = useNavigate();
  return (
    <MainShell
      session={session}
      onLogout={() => {
        onLogout();
        navigate("/login", { replace: true });
      }}
    />
  );
}

function LoginPage({
  authChecked,
  session,
  onSetSession,
}: {
  authChecked: boolean;
  session: SessionAccount | null;
  onSetSession: (a: SessionAccount) => void;
}) {
  const navigate = useNavigate();
  if (!authChecked) {
    return (
      <div className="app-shell">
        <p className="muted">Loading…</p>
      </div>
    );
  }
  if (session) {
    return <Navigate to={homeFor(session)} replace />;
  }
  return (
    <AuthGate
      onAuthed={(account) => {
        onSetSession(account);
        navigate(homeFor(account), { replace: true });
      }}
    />
  );
}

function AppRoutes() {
  const [authChecked, setAuthChecked] = useState(false);
  const [session, setSession] = useState<SessionAccount | null>(null);

  useEffect(() => {
    void (async () => {
      const t = getAuthToken();
      if (!t) {
        setSession(null);
        setAuthChecked(true);
        return;
      }
      try {
        const me = await apiGet<MeGuest | MeOrganizer>("/api/auth/me");
        if (me.role === "guest") {
          setSession({ role: "guest", ...me.user });
        } else {
          setSession({ role: "organizer", ...me.organizer });
        }
      } catch {
        clearAuthToken();
        setSession(null);
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage authChecked={authChecked} session={session} onSetSession={setSession} />}
      />
      <Route
        path="*"
        element={
          !authChecked ? (
            <div className="app-shell">
              <p className="muted">Loading…</p>
            </div>
          ) : !session ? (
            <Navigate to="/login" replace />
          ) : (
            <MainShellWithNav
              session={session}
              onLogout={() => {
                clearAuthToken();
                setSession(null);
              }}
            />
          )
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
