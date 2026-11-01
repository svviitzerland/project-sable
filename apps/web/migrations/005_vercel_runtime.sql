-- Shared Vercel coordination; apply before starting hosted functions.
BEGIN;


CREATE TABLE IF NOT EXISTS jude_runtime_leases (
	key VARCHAR(200) NOT NULL, 
	owner VARCHAR(36) NOT NULL, 
	expires FLOAT NOT NULL, 
	PRIMARY KEY (key)
)

;

CREATE INDEX IF NOT EXISTS ix_jude_runtime_leases_expires ON jude_runtime_leases (expires);

ALTER TABLE jude_runtime_leases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON jude_runtime_leases FROM anon, authenticated;


CREATE TABLE IF NOT EXISTS jude_runtime_events (
	case_id VARCHAR(36) NOT NULL, 
	revision INTEGER NOT NULL, 
	payload JSON NOT NULL, 
	PRIMARY KEY (case_id), 
	FOREIGN KEY(case_id) REFERENCES jude_cases (id) ON DELETE CASCADE
)

;

ALTER TABLE jude_runtime_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON jude_runtime_events FROM anon, authenticated;


CREATE TABLE IF NOT EXISTS jude_runtime_rates (
	key VARCHAR(64) NOT NULL, 
	hits INTEGER NOT NULL, 
	expires FLOAT NOT NULL, 
	PRIMARY KEY (key)
)

;

CREATE INDEX IF NOT EXISTS ix_jude_runtime_rates_expires ON jude_runtime_rates (expires);

ALTER TABLE jude_runtime_rates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON jude_runtime_rates FROM anon, authenticated;


CREATE TABLE IF NOT EXISTS jude_socket_tickets (
	token_hash VARCHAR(64) NOT NULL, 
	session_hash VARCHAR(64) NOT NULL, 
	case_id VARCHAR(36) NOT NULL, 
	purpose VARCHAR(12) NOT NULL, 
	expires FLOAT NOT NULL, 
	PRIMARY KEY (token_hash), 
	FOREIGN KEY(session_hash) REFERENCES jude_sessions (token_hash) ON DELETE CASCADE, 
	FOREIGN KEY(case_id) REFERENCES jude_cases (id) ON DELETE CASCADE
)

;

CREATE INDEX IF NOT EXISTS ix_jude_socket_tickets_expires ON jude_socket_tickets (expires);

ALTER TABLE jude_socket_tickets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON jude_socket_tickets FROM anon, authenticated;


CREATE TABLE IF NOT EXISTS jude_analysis_jobs (
	segment_id VARCHAR(36) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	attempts INTEGER NOT NULL, 
	dispatched_at FLOAT NOT NULL, 
	created_at FLOAT NOT NULL, 
	PRIMARY KEY (segment_id), 
	FOREIGN KEY(segment_id) REFERENCES jude_segments (id) ON DELETE CASCADE
)

;

ALTER TABLE jude_analysis_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON jude_analysis_jobs FROM anon, authenticated;


CREATE TABLE IF NOT EXISTS jude_file_transfers (
	id VARCHAR(36) NOT NULL, 
	owner_id VARCHAR(36) NOT NULL, 
	name VARCHAR(200) NOT NULL, 
	size INTEGER NOT NULL, 
	kind VARCHAR(12) NOT NULL, 
	parts JSON NOT NULL, 
	expires FLOAT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(owner_id) REFERENCES jude_users (id) ON DELETE CASCADE
)

;
CREATE INDEX IF NOT EXISTS ix_jude_file_transfers_expires ON jude_file_transfers (expires);
ALTER TABLE jude_file_transfers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON jude_file_transfers FROM anon, authenticated;

-- Private temporary exports can contain a full 64 MB case archive. Application
-- ingestion still limits each original to 6 MB and chunks uploads to 2 MB.
UPDATE storage.buckets SET file_size_limit = 67108864 WHERE id = 'jude-documents';

CREATE INDEX IF NOT EXISTS ix_jude_jobs_recovery ON jude_analysis_jobs(status, dispatched_at);
COMMIT;
