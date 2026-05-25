-- Run once if you created `event_mgmt` before `password_hash` existed on `users`.
-- Fresh installs: use `01_ddl.sql` only (column is already included).

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
