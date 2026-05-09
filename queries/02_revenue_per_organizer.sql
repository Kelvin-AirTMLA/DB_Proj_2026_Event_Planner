SELECT
    o.organizer_id,
    o.organizer_name,
    COALESCE(SUM(CASE
        WHEN p.payment_status = 'completed' THEN p.amount
        ELSE 0
    END), 0) AS total_revenue
FROM organizers o
LEFT JOIN events e
    ON o.organizer_id = e.organizer_id
LEFT JOIN ticket_types tt
    ON e.event_id = tt.event_id
LEFT JOIN bookings b
    ON tt.ticket_type_id = b.ticket_type_id
LEFT JOIN payments p
    ON b.booking_id = p.booking_id
GROUP BY o.organizer_id, o.organizer_name
ORDER BY total_revenue DESC;
