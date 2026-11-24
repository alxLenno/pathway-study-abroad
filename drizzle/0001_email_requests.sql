CREATE TABLE email_requests (id TEXT PRIMARY KEY NOT NULL, ip_hash TEXT NOT NULL, email_hash TEXT NOT NULL, created_at INTEGER NOT NULL, sent INTEGER NOT NULL DEFAULT 0);
--> statement-breakpoint
CREATE INDEX email_requests_created_idx ON email_requests (created_at);
--> statement-breakpoint
CREATE INDEX email_requests_ip_idx ON email_requests (ip_hash, created_at);
--> statement-breakpoint
CREATE INDEX email_requests_email_idx ON email_requests (email_hash, created_at);
