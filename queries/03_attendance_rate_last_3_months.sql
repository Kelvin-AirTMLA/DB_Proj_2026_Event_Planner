SELECT
    e.event_id,
    e.event_name,
    COUNT(DISTINCT b.booking_id) AS total_bookings,
    COUNT(DISTINCT ci.check_in_id) AS total_check_ins,
    ROUND(
        COUNT(DISTINCT ci.check_in_id) * 100.0 / NULLIF(COUNT(DISTINCT b.booking_id), 0),
        2
    ) AS attendance_rate_percent
FROM events e
LEFT JOIN ticket_types tt
    ON e.event_id = tt.event_id
LEFT JOIN bookings b
    ON tt.ticket_type_id = b.ticket_type_id
LEFT JOIN check_ins ci
    ON b.booking_id = ci.booking_id
WHERE e.start_datetime >= CURRENT_DATE - INTERVAL '3 months'
GROUP BY e.event_id, e.event_name
ORDER BY attendance_rate_percent DESC;
