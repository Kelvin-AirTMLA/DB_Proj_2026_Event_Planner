SELECT
    e.event_id,
    e.event_name,
    COUNT(DISTINCT (b.user_id, b.ticket_type_id, b.booking_date)) AS total_bookings,
    COUNT(DISTINCT (ci.user_id, ci.ticket_type_id, ci.booking_date)) AS total_check_ins,
    ROUND(
        COUNT(DISTINCT (ci.user_id, ci.ticket_type_id, ci.booking_date)) * 100.0
            / NULLIF(COUNT(DISTINCT (b.user_id, b.ticket_type_id, b.booking_date)), 0),
        2
    ) AS attendance_rate_percent
FROM events e
LEFT JOIN ticket_types tt
    ON e.event_id = tt.event_id
LEFT JOIN bookings b
    ON tt.ticket_type_id = b.ticket_type_id
LEFT JOIN check_ins ci
    ON ci.user_id = b.user_id
   AND ci.ticket_type_id = b.ticket_type_id
   AND ci.booking_date = b.booking_date
WHERE e.start_datetime >= CURRENT_DATE - INTERVAL '3 months'
GROUP BY e.event_id, e.event_name
ORDER BY attendance_rate_percent DESC;
