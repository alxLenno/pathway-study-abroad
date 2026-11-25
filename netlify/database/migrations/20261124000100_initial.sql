CREATE TABLE site_content (id INTEGER PRIMARY KEY CHECK (id = 1), content TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE email_requests (id TEXT PRIMARY KEY, ip_hash TEXT NOT NULL, email_hash TEXT NOT NULL, created_at BIGINT NOT NULL, sent INTEGER NOT NULL DEFAULT 0);
CREATE INDEX email_requests_created_idx ON email_requests (created_at);
CREATE INDEX email_requests_ip_idx ON email_requests (ip_hash, created_at);
CREATE INDEX email_requests_email_idx ON email_requests (email_hash, created_at);
CREATE TABLE admin_login_attempts (ip_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX admin_login_attempts_ip_idx ON admin_login_attempts (ip_hash, created_at);
