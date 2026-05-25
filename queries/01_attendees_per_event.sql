SELECT
    e.event_id,
    e.event_name,
    COALESCE(SUM(
        CASE
            WHEN b.booking_status = 'confirmed'
             AND p.payment_status = 'completed'
            THEN b.quantity
            ELSE 0
        END
    ), 0) AS total_attendees
FROM events e
LEFT JOIN ticket_types tt
    ON e.event_id = tt.event_id
LEFT JOIN bookings b
    ON tt.ticket_type_id = b.ticket_type_id
LEFT JOIN payments p
    ON p.user_id = b.user_id
   AND p.ticket_type_id = b.ticket_type_id
   AND p.booking_date = b.booking_date
GROUP BY e.event_id, e.event_name
ORDER BY total_attendees DESC;
