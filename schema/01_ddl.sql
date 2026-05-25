-- =============================================================================
-- Event Management App — PostgreSQL DDL
-- Matches docs/specification.md §8–§9, §11 and schema/schema.dbml
-- =============================================================================
--
-- HOW TO RUN (empty database recommended):
--
--   1. Create a database (once):
--        createdb event_mgmt
--
--   2. Apply this file:
--        psql -d event_mgmt -f schema/01_ddl.sql
--
--   Or from psql:  \i schema/01_ddl.sql
--
-- Timestamps: TIMESTAMP without time zone (naive local), per spec §9.
-- =============================================================================

-- Extensions (optional; not required for this schema)
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- Base tables
-- -----------------------------------------------------------------------------

CREATE TABLE organizers (
    organizer_id   SERIAL PRIMARY KEY,
    username       VARCHAR(50)  NOT NULL UNIQUE,
    organizer_name VARCHAR(200) NOT NULL,
    email          VARCHAR(255) NOT NULL UNIQUE,
    password_hash  VARCHAR(255),
    phone          VARCHAR(50),
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    user_id       SERIAL PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    full_name     VARCHAR(200) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    phone         VARCHAR(50),
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE venues (
    venue_id   SERIAL PRIMARY KEY,
    venue_name VARCHAR(200) NOT NULL,
    address    VARCHAR(300) NOT NULL,
    city       VARCHAR(100) NOT NULL,
    capacity   INTEGER NOT NULL,
    CONSTRAINT chk_venues_capacity_positive CHECK (capacity > 0)
);

-- -----------------------------------------------------------------------------
-- Events & ticketing
-- -----------------------------------------------------------------------------

CREATE TABLE events (
    event_id       SERIAL PRIMARY KEY,
    organizer_id   INTEGER NOT NULL,
    venue_id       INTEGER NOT NULL,
    event_name     VARCHAR(200) NOT NULL,
    description    TEXT,
    category       VARCHAR(100),
    start_datetime TIMESTAMP NOT NULL,
    end_datetime   TIMESTAMP NOT NULL,
    status         VARCHAR(50) NOT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_events_end_after_start CHECK (end_datetime > start_datetime),
    CONSTRAINT chk_events_status_allowed CHECK (
        status IN ('pending', 'ongoing', 'done')
    ),
    CONSTRAINT fk_events_organizer
        FOREIGN KEY (organizer_id) REFERENCES organizers (organizer_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_events_venue
        FOREIGN KEY (venue_id) REFERENCES venues (venue_id)
        ON DELETE CASCADE
);

CREATE TABLE ticket_types (
    ticket_type_id     SERIAL PRIMARY KEY,
    event_id           INTEGER NOT NULL,
    ticket_name        VARCHAR(120) NOT NULL,
    price              NUMERIC(10, 2) NOT NULL,
    quantity_available INTEGER NOT NULL,
    CONSTRAINT chk_ticket_types_price_non_negative CHECK (price >= 0),
    CONSTRAINT chk_ticket_types_qty_non_negative CHECK (quantity_available >= 0),
    CONSTRAINT fk_ticket_types_event
        FOREIGN KEY (event_id) REFERENCES events (event_id)
        ON DELETE CASCADE
);

-- Natural (composite) PK on bookings: who bought which ticket tier and when.
-- Surrogate booking_id removed — one row is identified by (user, ticket_type, booking_date).
CREATE TABLE bookings (
    user_id        INTEGER NOT NULL,
    ticket_type_id INTEGER NOT NULL,
    booking_date   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    quantity       INTEGER NOT NULL,
    booking_status VARCHAR(50) NOT NULL,
    PRIMARY KEY (user_id, ticket_type_id, booking_date),
    CONSTRAINT chk_bookings_quantity_positive CHECK (quantity >= 1),
    CONSTRAINT chk_bookings_status_allowed CHECK (
        booking_status IN ('pending', 'confirmed', 'cancelled')
    ),
    CONSTRAINT fk_bookings_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_bookings_ticket_type
        FOREIGN KEY (ticket_type_id) REFERENCES ticket_types (ticket_type_id)
        ON DELETE CASCADE
);

-- 1:1 with booking — same composite key (natural FK, not a separate surrogate).
CREATE TABLE payments (
    user_id          INTEGER NOT NULL,
    ticket_type_id   INTEGER NOT NULL,
    booking_date     TIMESTAMP NOT NULL,
    amount           NUMERIC(10, 2) NOT NULL,
    payment_method   VARCHAR(50) NOT NULL,
    payment_status   VARCHAR(50) NOT NULL,
    payment_date     TIMESTAMP NOT NULL,
    PRIMARY KEY (user_id, ticket_type_id, booking_date),
    CONSTRAINT chk_payments_amount_non_negative CHECK (amount >= 0),
    CONSTRAINT chk_payments_status_allowed CHECK (
        payment_status IN ('pending', 'completed', 'failed')
    ),
    CONSTRAINT fk_payments_booking
        FOREIGN KEY (user_id, ticket_type_id, booking_date)
        REFERENCES bookings (user_id, ticket_type_id, booking_date)
        ON DELETE CASCADE
);

-- 0..1 per booking — PK matches the booking composite key.
CREATE TABLE check_ins (
    user_id        INTEGER NOT NULL,
    ticket_type_id INTEGER NOT NULL,
    booking_date   TIMESTAMP NOT NULL,
    check_in_time  TIMESTAMP NOT NULL,
    checked_in_by  INTEGER,
    PRIMARY KEY (user_id, ticket_type_id, booking_date),
    CONSTRAINT fk_check_ins_booking
        FOREIGN KEY (user_id, ticket_type_id, booking_date)
        REFERENCES bookings (user_id, ticket_type_id, booking_date)
        ON DELETE CASCADE,
    CONSTRAINT fk_check_ins_checked_in_by
        FOREIGN KEY (checked_in_by) REFERENCES organizers (organizer_id)
        ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- Indexes (spec §11; FK columns + time-range browse)
-- PKs and UNIQUE columns already have backing indexes in PostgreSQL.
-- -----------------------------------------------------------------------------

CREATE INDEX idx_events_organizer_id ON events (organizer_id);
CREATE INDEX idx_events_venue_id ON events (venue_id);
CREATE INDEX idx_events_start_datetime ON events (start_datetime);

CREATE INDEX idx_ticket_types_event_id ON ticket_types (event_id);

CREATE INDEX idx_bookings_user_id ON bookings (user_id);
CREATE INDEX idx_bookings_ticket_type_id ON bookings (ticket_type_id);

-- payments / check_ins use the booking composite PK (no extra surrogate ids)
