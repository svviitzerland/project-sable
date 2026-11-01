-- Per-case voiceprints from the optional voice service. Biometric data: never exported, deletable per case.
BEGIN;
CREATE TABLE IF NOT EXISTS jude_voiceprints (
 id VARCHAR(36) PRIMARY KEY,
 case_id VARCHAR(36) NOT NULL REFERENCES jude_cases(id) ON DELETE CASCADE,
 label VARCHAR(40) NOT NULL,
 embedding JSON NOT NULL,
 samples INTEGER NOT NULL,
 model VARCHAR(200) NOT NULL,
 aliases JSON NOT NULL,
 created_at VARCHAR(40) NOT NULL,
 UNIQUE (case_id, label)
);
CREATE INDEX IF NOT EXISTS ix_jude_voiceprints_case_id ON jude_voiceprints(case_id);
ALTER TABLE jude_voiceprints ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON jude_voiceprints FROM PUBLIC, anon, authenticated;
COMMIT;
