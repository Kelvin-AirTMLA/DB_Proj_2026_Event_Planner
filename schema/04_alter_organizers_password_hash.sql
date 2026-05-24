-- Run once if you created `event_mgmt` before `password_hash` existed on `organizers`.
-- Fresh installs: use `01_ddl.sql` only (column is already included).

ALTER TABLE organizers
    ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
