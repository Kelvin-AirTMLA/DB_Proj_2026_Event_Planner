-- Run once if organizers lack `username` (older DBs).
-- Fresh installs: use `01_ddl.sql` only.

ALTER TABLE organizers
    ADD COLUMN IF NOT EXISTS username VARCHAR(50);

UPDATE organizers SET username = 'nle_events' WHERE organizer_id = 1 AND username IS NULL;
UPDATE organizers SET username = 'campus_lab' WHERE organizer_id = 2 AND username IS NULL;
UPDATE organizers SET username = 'tartu_cg' WHERE organizer_id = 3 AND username IS NULL;
UPDATE organizers SET username = 'baltic_meet' WHERE organizer_id = 4 AND username IS NULL;
UPDATE organizers SET username = 'seu_union' WHERE organizer_id = 5 AND username IS NULL;

ALTER TABLE organizers
    ALTER COLUMN username SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS organizers_username_key ON organizers (username);
