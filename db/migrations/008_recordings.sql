-- Audio recordings of live hearing sessions (browser MediaRecorder), stored in private S3.
-- Recordings require the presiding judge's permission and stay deletable per case.
BEGIN;
CREATE TABLE IF NOT EXISTS jude_recordings (
 id VARCHAR(36) PRIMARY KEY,
 case_id VARCHAR(36) NOT NULL REFERENCES jude_cases(id) ON DELETE CASCADE,
 hearing_id VARCHAR(36) NOT NULL REFERENCES jude_hearings(id) ON DELETE CASCADE,
 storage_key TEXT NOT NULL,
 storage VARCHAR(20) NOT NULL,
 mime VARCHAR(100) NOT NULL,
 size INTEGER NOT NULL,
 start_offset FLOAT NOT NULL,
 duration FLOAT NOT NULL,
 created_at VARCHAR(40) NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_jude_recordings_hearing_id ON jude_recordings(hearing_id);
ALTER TABLE jude_recordings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON jude_recordings FROM PUBLIC, anon, authenticated;
COMMIT;
