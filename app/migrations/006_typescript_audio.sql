-- Browser-to-provider speech uses short-lived credentials and authenticated saves.
BEGIN;
CREATE TABLE IF NOT EXISTS jude_audio_sessions (
 id VARCHAR(36) PRIMARY KEY,
 case_id VARCHAR(36) NOT NULL REFERENCES jude_cases(id) ON DELETE CASCADE,
 hearing_id VARCHAR(36) NOT NULL REFERENCES jude_hearings(id) ON DELETE CASCADE,
 session_hash VARCHAR(64) NOT NULL REFERENCES jude_sessions(token_hash) ON DELETE CASCADE,
 "offset" FLOAT NOT NULL,
 last_sequence INTEGER NOT NULL,
 expires FLOAT NOT NULL,
 status VARCHAR(20) NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_jude_audio_sessions_expires ON jude_audio_sessions(expires);
ALTER TABLE jude_audio_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON jude_audio_sessions FROM PUBLIC, anon, authenticated;
COMMIT;
