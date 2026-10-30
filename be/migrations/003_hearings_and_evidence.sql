-- Additive migration. Apply after 001 and 002; safe to repeat.
CREATE TABLE IF NOT EXISTS jude_hearings (
  id varchar(36) PRIMARY KEY,
  case_id varchar(36) NOT NULL REFERENCES jude_cases(id) ON DELETE CASCADE,
  title varchar(160) NOT NULL,
  date varchar(40) NOT NULL DEFAULT '',
  kind varchar(24) NOT NULL DEFAULT 'manual',
  status varchar(24) NOT NULL DEFAULT 'ready',
  source_document_id varchar(36) REFERENCES jude_documents(id),
  created_at varchar(40) NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_jude_hearings_case_id ON jude_hearings(case_id);
ALTER TABLE jude_segments ADD COLUMN IF NOT EXISTS hearing_id varchar(36) REFERENCES jude_hearings(id);
CREATE INDEX IF NOT EXISTS ix_jude_segments_hearing_id ON jude_segments(hearing_id);
ALTER TABLE jude_chunks ADD COLUMN IF NOT EXISTS embedding_model varchar(200) NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS jude_evidence_links (
  id varchar(36) PRIMARY KEY,
  case_id varchar(36) NOT NULL REFERENCES jude_cases(id) ON DELETE CASCADE,
  source_id varchar(36) NOT NULL REFERENCES jude_chunks(id) ON DELETE CASCADE,
  target_id varchar(36) NOT NULL REFERENCES jude_chunks(id) ON DELETE CASCADE,
  relation varchar(24) NOT NULL DEFAULT 'related',
  explanation text NOT NULL DEFAULT '',
  basis varchar(24) NOT NULL DEFAULT 'manual',
  confirmed boolean NOT NULL DEFAULT false,
  score double precision,
  source_quote text NOT NULL DEFAULT '',
  target_quote text NOT NULL DEFAULT '',
  created_at varchar(40) NOT NULL,
  UNIQUE(case_id, source_id, target_id)
);
CREATE INDEX IF NOT EXISTS ix_jude_evidence_links_case_id ON jude_evidence_links(case_id);
ALTER TABLE jude_hearings ENABLE ROW LEVEL SECURITY;
ALTER TABLE jude_evidence_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON jude_hearings, jude_evidence_links FROM anon, authenticated;
-- Backend startup moves legacy statements into an Earlier hearing per case.
-- Existing embeddings have unknown model provenance and are rebuilt on Find connections.
