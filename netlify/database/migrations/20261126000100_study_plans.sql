CREATE TABLE study_plans (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '', destination TEXT NOT NULL, level TEXT NOT NULL, intake TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','in_progress','closed')), created_at BIGINT NOT NULL, consent_at BIGINT NOT NULL, ip_hash TEXT NOT NULL);
CREATE INDEX study_plans_date_idx ON study_plans (created_at DESC);
CREATE INDEX study_plans_email_idx ON study_plans (email, created_at);
CREATE INDEX study_plans_ip_idx ON study_plans (ip_hash, created_at);
CREATE INDEX study_plans_status_idx ON study_plans (status, created_at DESC);
