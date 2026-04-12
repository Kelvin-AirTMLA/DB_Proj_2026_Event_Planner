-- =============================================================================
-- Event Management App — seed data (PostgreSQL)
-- Run AFTER schema/01_ddl.sql on an empty database:
--   psql -d event_mgmt -f schema/02_seed.sql
--
-- Targets ~spec §10: 5 organizers, 15 users, 5 venues, 10 events, 20 ticket
-- types, 40 bookings, 1 payment per booking, check-ins on a subset.
-- Status strings: spec §5.3. Currency: EUR (amounts only).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Organizers (5)
-- -----------------------------------------------------------------------------
INSERT INTO organizers (organizer_id, organizer_name, email, phone, created_at) VALUES
(1, 'Northern Lights Events', 'hello@nlevents.eu', '+372 555 0101', '2025-06-01 10:00:00'),
(2, 'Campus Workshop Lab', 'info@campuslab.eu', '+372 555 0202', '2025-07-15 11:00:00'),
(3, 'Tartu Conference Group', 'book@tartucg.eu', '+372 555 0303', '2025-08-01 09:00:00'),
(4, 'Baltic Meetups OÜ', 'crew@balticmeet.eu', '+372 555 0404', '2025-09-10 14:00:00'),
(5, 'Student Events Union', 'seu@university.edu', NULL, '2025-10-01 12:00:00');

-- -----------------------------------------------------------------------------
-- Users (15) — username UNIQUE; duplicate emails allowed
-- -----------------------------------------------------------------------------
INSERT INTO users (user_id, username, full_name, email, phone, created_at) VALUES
(1,  'alex_m',    'Alex Martin',      'alex.m@student.edu',   '+372 5001', '2025-11-01 09:00:00'),
(2,  'sam_k',     'Sam Kask',         'alex.m@student.edu',   '+372 5002', '2025-11-02 09:00:00'),
(3,  'jordan_p',  'Jordan Pärn',      'jordan@mail.eu',       NULL,        '2025-11-03 09:00:00'),
(4,  'taylor_r',  'Taylor Rebane',    'taylor.r@company.eu',  '+372 5004', '2025-11-04 09:00:00'),
(5,  'riley_v',   'Riley Vaher',      'family@home.eu',       '+372 5005', '2025-11-05 09:00:00'),
(6,  'casey_v',   'Casey Vaher',      'family@home.eu',       '+372 5006', '2025-11-06 09:00:00'),
(7,  'morgan_l',  'Morgan Laas',      'morgan@mail.eu',       NULL,        '2025-11-07 09:00:00'),
(8,  'jamie_t',   'Jamie Tamm',       'jamie@startup.eu',     '+372 5008', '2025-11-08 09:00:00'),
(9,  'drew_o',    'Drew Oja',         'drew@mail.eu',         '+372 5009', '2025-11-09 09:00:00'),
(10, 'blake_s',   'Blake Saar',       'blake.s@student.edu',  NULL,        '2025-11-10 09:00:00'),
(11, 'cameron_k', 'Cameron Kivi',     'cameron@mail.eu',      '+372 5011', '2025-11-11 09:00:00'),
(12, 'skyler_n',  'Skyler Nõmm',      'skyler@mail.eu',       '+372 5012', '2025-11-12 09:00:00'),
(13, 'avery_h',   'Avery Hunt',       'avery@company.eu',     NULL,        '2025-11-13 09:00:00'),
(14, 'quinn_m',   'Quinn Mägi',       'quinn@mail.eu',        '+372 5014', '2025-11-14 09:00:00'),
(15, 'reese_l',   'Reese Lääne',      'reese@mail.eu',        '+372 5015', '2025-11-15 09:00:00');

-- -----------------------------------------------------------------------------
-- Venues (5)
-- -----------------------------------------------------------------------------
INSERT INTO venues (venue_id, venue_name, address, city, capacity) VALUES
(1, 'Creative Hub Tallinn', 'Pärnu mnt 67',        'Tallinn',  180),
(2, 'University Main Hall', 'Ülikooli 18',       'Tartu',    420),
(3, 'Innovation Loft', 'Telliskivi 60',          'Tallinn',   90),
(4, 'Nordic Auditorium', 'Narva mnt 7',          'Tallinn',  300),
(5, 'Campus B Building', 'Liivi 2',               'Tartu',    150);

-- -----------------------------------------------------------------------------
-- Events (10) — mix done / ongoing / pending; dates support “last 3 months” demos
-- -----------------------------------------------------------------------------
INSERT INTO events (
    event_id, organizer_id, venue_id, event_name, description, category,
    start_datetime, end_datetime, status, created_at
) VALUES
(1, 1, 1, 'Design Systems Day', 'Single-track UI workshop', 'workshop',
 '2025-11-10 09:00:00', '2025-11-10 17:00:00', 'done', '2025-10-01 12:00:00'),
(2, 1, 3, 'Afterhours Networking', 'Informal meetup', 'networking',
 '2025-12-05 18:00:00', '2025-12-05 21:00:00', 'done', '2025-11-01 12:00:00'),
(3, 2, 2, 'Database Fundamentals Intensive', 'SQL & modeling', 'course',
 '2026-01-20 10:00:00', '2026-01-20 16:00:00', 'done', '2025-12-01 12:00:00'),
(4, 2, 5, 'Winter Student Fair', 'Clubs and projects', 'fair',
 '2026-02-15 11:00:00', '2026-02-15 15:00:00', 'done', '2026-01-05 12:00:00'),
(5, 3, 4, 'Baltic Data Summit', 'Analytics & BI', 'conference',
 '2026-03-01 09:00:00', '2026-03-01 18:00:00', 'done', '2026-01-10 12:00:00'),
(6, 3, 2, 'Research Methods Seminar', 'PhD-focused', 'seminar',
 '2026-03-25 13:00:00', '2026-03-25 17:00:00', 'done', '2026-02-01 12:00:00'),
(7, 4, 1, 'Product Leaders Breakfast', 'Roundtable', 'meetup',
 '2026-04-05 08:00:00', '2026-04-05 10:00:00', 'done', '2026-03-01 12:00:00'),
(8, 4, 3, 'Spring Hack Night', 'Open hack', 'hackathon',
 '2026-04-01 17:00:00', '2026-04-30 22:00:00', 'ongoing', '2026-03-15 12:00:00'),
(9, 5, 5, 'Graduation Gala 2026', 'Formal dinner', 'gala',
 '2026-05-15 18:00:00', '2026-05-15 23:00:00', 'pending', '2026-04-01 12:00:00'),
(10, 5, 2, 'Summer Orientation', 'New students', 'orientation',
 '2026-06-20 09:00:00', '2026-06-20 13:00:00', 'pending', '2026-04-05 12:00:00');

-- -----------------------------------------------------------------------------
-- Ticket types (20) — two per event
-- -----------------------------------------------------------------------------
INSERT INTO ticket_types (ticket_type_id, event_id, ticket_name, price, quantity_available) VALUES
(1,  1, 'General',   50.00, 120),
(2,  1, 'VIP',      120.00,  30),
(3,  2, 'Standard',  15.00,  80),
(4,  2, 'Sponsor',   40.00,  20),
(5,  3, 'Student',   35.00, 200),
(6,  3, 'Pro',       70.00,  50),
(7,  4, 'Entry',     10.00, 400),
(8,  4, 'Exhibitor', 45.00,  40),
(9,  5, 'Day pass',  95.00, 250),
(10, 5, 'Workshop+',180.00,  40),
(11, 6, 'Auditor',   25.00, 150),
(12, 6, 'Panel',     55.00,  30),
(13, 7, 'Seat',      30.00,  60),
(14, 7, 'Sponsor',   80.00,  15),
(15, 8, 'Hacker',     0.00, 100),
(16, 8, 'Mentor',    20.00,  25),
(17, 9, 'Guest',     75.00, 180),
(18, 9, 'Staff',      0.00,  40),
(19, 10, 'New admit', 12.00, 500),
(20, 10, 'Guest',     25.00, 100);

-- -----------------------------------------------------------------------------
-- Bookings (40)
-- -----------------------------------------------------------------------------
INSERT INTO bookings (booking_id, user_id, ticket_type_id, quantity, booking_date, booking_status) VALUES
(1,  1,  5, 2, '2026-01-05 10:00:00', 'confirmed'),
(2,  2,  5, 1, '2026-01-06 11:00:00', 'confirmed'),
(3,  3,  6, 1, '2026-01-07 12:00:00', 'confirmed'),
(4,  4,  7, 3, '2026-01-20 09:00:00', 'confirmed'),
(5,  5,  8, 1, '2026-01-21 10:00:00', 'confirmed'),
(6,  6,  9, 2, '2026-02-01 14:00:00', 'confirmed'),
(7,  7,  9, 1, '2026-02-02 15:00:00', 'confirmed'),
(8,  8, 10, 1, '2026-02-03 16:00:00', 'confirmed'),
(9,  9, 11, 2, '2026-02-10 10:00:00', 'confirmed'),
(10, 10, 11, 1, '2026-02-11 11:00:00', 'confirmed'),
(11, 11, 12, 1, '2026-02-12 12:00:00', 'confirmed'),
(12, 12, 13, 2, '2026-03-01 09:00:00', 'confirmed'),
(13, 13, 13, 1, '2026-03-02 10:00:00', 'confirmed'),
(14, 14, 14, 1, '2026-03-03 11:00:00', 'confirmed'),
(15, 15,  1, 1, '2025-10-15 10:00:00', 'confirmed'),
(16, 1,   2, 2, '2025-10-16 11:00:00', 'confirmed'),
(17, 2,   3, 4, '2025-11-20 12:00:00', 'confirmed'),
(18, 3,   4, 1, '2025-11-21 13:00:00', 'confirmed'),
(19, 4,   6, 1, '2026-01-08 14:00:00', 'confirmed'),
(20, 5,   5, 1, '2026-01-09 15:00:00', 'confirmed'),
(21, 6,  10, 1, '2026-02-04 16:00:00', 'confirmed'),
(22, 7,   9, 3, '2026-02-05 17:00:00', 'confirmed'),
(23, 8,  12, 1, '2026-02-13 18:00:00', 'confirmed'),
(24, 9,  11, 2, '2026-02-14 19:00:00', 'confirmed'),
(25, 10, 14, 1, '2026-03-04 10:00:00', 'confirmed'),
(26, 11,  6, 1, '2026-01-10 10:00:00', 'confirmed'),
(27, 12,  7, 2, '2026-01-22 11:00:00', 'confirmed'),
(28, 13,  8, 1, '2026-01-23 12:00:00', 'confirmed'),
(29, 14,  9, 1, '2026-02-06 13:00:00', 'confirmed'),
(30, 15, 10, 1, '2026-02-07 14:00:00', 'confirmed'),
(31, 1,  15, 1, '2026-04-02 10:00:00', 'confirmed'),
(32, 2,  16, 1, '2026-04-03 11:00:00', 'confirmed'),
(33, 3,  5, 1, '2026-01-11 10:00:00', 'confirmed'),
(34, 4,  6, 1, '2026-01-12 11:00:00', 'confirmed'),
(35, 5,  1, 1, '2025-10-17 12:00:00', 'pending'),
(36, 6,  17, 2, '2026-04-06 09:00:00', 'pending'),
(37, 7,  19, 1, '2026-04-07 10:00:00', 'pending'),
(38, 8,  20, 2, '2026-04-08 11:00:00', 'pending'),
(39, 9,  3, 1, '2025-11-22 14:00:00', 'cancelled'),
(40, 10, 4, 1, '2025-11-23 15:00:00', 'cancelled');

-- -----------------------------------------------------------------------------
-- Payments (40) — exactly one per booking; amount = price * quantity where paid
-- -----------------------------------------------------------------------------
INSERT INTO payments (payment_id, booking_id, amount, payment_method, payment_status, payment_date) VALUES
(1,  1,  70.00, 'card',     'completed', '2026-01-05 10:05:00'),
(2,  2,  35.00, 'card',     'completed', '2026-01-06 11:05:00'),
(3,  3,  70.00, 'card',     'completed', '2026-01-07 12:05:00'),
(4,  4,  30.00, 'ideal',    'completed', '2026-01-20 09:10:00'),
(5,  5,  45.00, 'card',     'completed', '2026-01-21 10:10:00'),
(6,  6, 190.00, 'card',     'completed', '2026-02-01 14:10:00'),
(7,  7,  95.00, 'card',     'completed', '2026-02-02 15:10:00'),
(8,  8, 180.00, 'transfer', 'completed', '2026-02-03 16:10:00'),
(9,  9,  50.00, 'card',     'completed', '2026-02-10 10:10:00'),
(10, 10, 25.00, 'card',     'completed', '2026-02-11 11:10:00'),
(11, 11, 55.00, 'card',     'completed', '2026-02-12 12:10:00'),
(12, 12, 60.00, 'card',     'completed', '2026-03-01 09:10:00'),
(13, 13, 30.00, 'ideal',    'completed', '2026-03-02 10:10:00'),
(14, 14, 80.00, 'card',     'completed', '2026-03-03 11:10:00'),
(15, 15, 50.00, 'card',     'completed', '2025-10-15 10:10:00'),
(16, 16, 240.00, 'card',    'completed', '2025-10-16 11:10:00'),
(17, 17, 60.00, 'card',     'completed', '2025-11-20 12:10:00'),
(18, 18, 40.00, 'card',     'completed', '2025-11-21 13:10:00'),
(19, 19, 70.00, 'card',     'completed', '2026-01-08 14:10:00'),
(20, 20, 35.00, 'ideal',    'completed', '2026-01-09 15:10:00'),
(21, 21, 180.00, 'transfer','completed', '2026-02-04 16:10:00'),
(22, 22, 285.00, 'card',     'completed', '2026-02-05 17:10:00'),
(23, 23, 55.00, 'card',     'completed', '2026-02-13 18:10:00'),
(24, 24, 50.00, 'card',     'completed', '2026-02-14 19:10:00'),
(25, 25, 80.00, 'card',     'completed', '2026-03-04 10:10:00'),
(26, 26, 70.00, 'card',     'pending',   '2026-01-10 10:10:00'),
(27, 27, 20.00, 'card',     'failed',    '2026-01-22 11:10:00'),
(28, 28, 45.00, 'ideal',    'completed', '2026-01-23 12:10:00'),
(29, 29, 95.00, 'card',     'pending',   '2026-02-06 13:10:00'),
(30, 30, 180.00, 'card',    'failed',    '2026-02-07 14:10:00'),
(31, 31,  0.00, 'free',     'completed', '2026-04-02 10:10:00'),
(32, 32, 20.00, 'card',     'completed', '2026-04-03 11:10:00'),
(33, 33, 35.00, 'card',     'failed',    '2026-01-11 10:10:00'),
(34, 34, 70.00, 'card',     'pending',   '2026-01-12 11:10:00'),
(35, 35, 50.00, 'card',     'pending',   '2025-10-17 12:10:00'),
(36, 36, 150.00, 'card',    'pending',   '2026-04-06 09:10:00'),
(37, 37, 12.00, 'card',     'pending',   '2026-04-07 10:10:00'),
(38, 38, 50.00, 'ideal',    'pending',   '2026-04-08 11:10:00'),
(39, 39, 15.00, 'card',     'failed',    '2025-11-22 14:10:00'),
(40, 40, 40.00, 'card',     'failed',    '2025-11-23 15:10:00');

-- -----------------------------------------------------------------------------
-- Check-ins — subset of completed bookings on done events (organizer staff id)
-- -----------------------------------------------------------------------------
INSERT INTO check_ins (check_in_id, booking_id, check_in_time, checked_in_by) VALUES
(1,  1,  '2026-01-20 09:30:00', 2),
(2,  2,  '2026-01-20 09:35:00', 2),
(3,  3,  '2026-01-20 09:40:00', 2),
(4,  4,  '2026-02-15 11:15:00', 2),
(5,  5,  '2026-02-15 11:20:00', 2),
(6,  6,  '2026-03-01 09:15:00', 3),
(7,  7,  '2026-03-01 09:20:00', 3),
(8,  8,  '2026-03-01 09:25:00', 3),
(9,  9,  '2026-03-25 13:15:00', 3),
(10, 10, '2026-03-25 13:20:00', 3),
(11, 11, '2026-03-25 13:25:00', 3),
(12, 12, '2026-04-05 08:15:00', 4),
(13, 13, '2026-04-05 08:20:00', 4),
(14, 14, '2026-04-05 08:25:00', 4),
(15, 15, '2025-11-10 09:15:00', 1),
(16, 16, '2025-11-10 09:20:00', 1),
(17, 17, '2025-12-05 18:15:00', 1),
(18, 18, '2025-12-05 18:20:00', 1);

-- -----------------------------------------------------------------------------
-- Keep SERIAL sequences aligned after explicit IDs
-- -----------------------------------------------------------------------------
SELECT setval(pg_get_serial_sequence('organizers',   'organizer_id'),   (SELECT MAX(organizer_id)   FROM organizers));
SELECT setval(pg_get_serial_sequence('users',        'user_id'),        (SELECT MAX(user_id)        FROM users));
SELECT setval(pg_get_serial_sequence('venues',       'venue_id'),       (SELECT MAX(venue_id)       FROM venues));
SELECT setval(pg_get_serial_sequence('events',       'event_id'),       (SELECT MAX(event_id)       FROM events));
SELECT setval(pg_get_serial_sequence('ticket_types', 'ticket_type_id'), (SELECT MAX(ticket_type_id) FROM ticket_types));
SELECT setval(pg_get_serial_sequence('bookings',     'booking_id'),     (SELECT MAX(booking_id)     FROM bookings));
SELECT setval(pg_get_serial_sequence('payments',     'payment_id'),     (SELECT MAX(payment_id)     FROM payments));
SELECT setval(pg_get_serial_sequence('check_ins',    'check_in_id'),    (SELECT MAX(check_in_id)    FROM check_ins));

COMMIT;
