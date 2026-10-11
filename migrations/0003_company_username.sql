-- Run once against the existing pulse-db D1 database before deploying v0.3.2.
-- Keeps existing accounts and work orders. Existing accounts receive a username equal to their email.
ALTER TABLE users ADD COLUMN company_id TEXT NOT NULL DEFAULT 'pulse-demo';
ALTER TABLE users ADD COLUMN username TEXT;
UPDATE users SET username = lower(email) WHERE username IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_company_username ON users(company_id, username);
