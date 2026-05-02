SELECT
    e.event_id,
    e.event_name,
    COUNT(ci.check_in_id) AS total_attendees
FROM events e
LEFT JOIN ticket_types tt
    ON e.event_id = tt.event_id
LEFT JOIN bookings b
    ON tt.ticket_type_id = b.ticket_type_id
LEFT JOIN check_ins ci
    ON b.booking_id = ci.booking_id
GROUP BY e.event_id, e.event_name
ORDER BY total_attendees DESC;
