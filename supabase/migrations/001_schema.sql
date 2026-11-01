-- Jude schema. Run as the backend table owner in a new Supabase project.
BEGIN;

CREATE TABLE IF NOT EXISTS jude_users (
	id VARCHAR(36) NOT NULL,
	email VARCHAR(254) NOT NULL,
	name VARCHAR(100) NOT NULL,
	password_hash TEXT NOT NULL,
	demo BOOLEAN NOT NULL,
	PRIMARY KEY (id),
	UNIQUE (email)
)

;
ALTER TABLE jude_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON jude_users FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS jude_cases (
	id VARCHAR(36) NOT NULL,
	owner_id VARCHAR(36) NOT NULL,
	title VARCHAR(160) NOT NULL,
	reference VARCHAR(100) NOT NULL,
	description TEXT NOT NULL,
	synthetic BOOLEAN NOT NULL,
	status VARCHAR(24) NOT NULL,
	created_at VARCHAR(40) NOT NULL,
	speakers JSON NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(owner_id) REFERENCES jude_users (id)
)

;
ALTER TABLE jude_cases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON jude_cases FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS jude_sessions (
	token_hash VARCHAR(64) NOT NULL,
	user_id VARCHAR(36) NOT NULL,
	expires FLOAT NOT NULL,
	PRIMARY KEY (token_hash),
	FOREIGN KEY(user_id) REFERENCES jude_users (id) ON DELETE CASCADE
)

;
ALTER TABLE jude_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON jude_sessions FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS jude_documents (
	id VARCHAR(36) NOT NULL,
	case_id VARCHAR(36) NOT NULL,
	name VARCHAR(200) NOT NULL,
	mime VARCHAR(100) NOT NULL,
	storage_key TEXT NOT NULL,
	storage VARCHAR(20) NOT NULL,
	digest VARCHAR(64) NOT NULL,
	pages INTEGER NOT NULL,
	created_at VARCHAR(40) NOT NULL,
	PRIMARY KEY (id),
	UNIQUE (case_id, digest),
	FOREIGN KEY(case_id) REFERENCES jude_cases (id) ON DELETE CASCADE
)

;
CREATE INDEX IF NOT EXISTS ix_jude_documents_case_id ON jude_documents (case_id);
ALTER TABLE jude_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON jude_documents FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS jude_segments (
	id VARCHAR(36) NOT NULL,
	case_id VARCHAR(36) NOT NULL,
	text TEXT NOT NULL,
	speaker VARCHAR(80) NOT NULL,
	start FLOAT NOT NULL,
	"end" FLOAT NOT NULL,
	confidence FLOAT,
	origin VARCHAR(24) NOT NULL,
	analysis_state VARCHAR(30) NOT NULL,
	analysis_error TEXT,
	created_at VARCHAR(40) NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(case_id) REFERENCES jude_cases (id) ON DELETE CASCADE
)

;
CREATE INDEX IF NOT EXISTS ix_jude_segments_case_id ON jude_segments (case_id);
ALTER TABLE jude_segments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON jude_segments FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS jude_chunks (
	id VARCHAR(36) NOT NULL,
	case_id VARCHAR(36) NOT NULL,
	document_id VARCHAR(36) NOT NULL,
	page INTEGER NOT NULL,
	section VARCHAR(100) NOT NULL,
	text TEXT NOT NULL,
	embedding JSON,
	PRIMARY KEY (id),
	FOREIGN KEY(case_id) REFERENCES jude_cases (id) ON DELETE CASCADE,
	FOREIGN KEY(document_id) REFERENCES jude_documents (id) ON DELETE CASCADE
)

;
CREATE INDEX IF NOT EXISTS ix_jude_chunks_case_id ON jude_chunks (case_id);
ALTER TABLE jude_chunks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON jude_chunks FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS jude_findings (
	id VARCHAR(36) NOT NULL,
	case_id VARCHAR(36) NOT NULL,
	segment_id VARCHAR(36) NOT NULL,
	status VARCHAR(32) NOT NULL,
	title VARCHAR(240) NOT NULL,
	explanation TEXT NOT NULL,
	uncertainty TEXT NOT NULL,
	verification TEXT NOT NULL,
	question TEXT NOT NULL,
	citations JSON NOT NULL,
	review JSON NOT NULL,
	legal JSON NOT NULL,
	mode VARCHAR(20) NOT NULL,
	elapsed_ms INTEGER NOT NULL,
	reviewed BOOLEAN NOT NULL,
	note TEXT NOT NULL,
	created_at VARCHAR(40) NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(case_id) REFERENCES jude_cases (id) ON DELETE CASCADE,
	UNIQUE (segment_id),
	FOREIGN KEY(segment_id) REFERENCES jude_segments (id) ON DELETE CASCADE
)

;
CREATE INDEX IF NOT EXISTS ix_jude_findings_case_id ON jude_findings (case_id);
ALTER TABLE jude_findings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON jude_findings FROM PUBLIC, anon, authenticated;
COMMIT;
