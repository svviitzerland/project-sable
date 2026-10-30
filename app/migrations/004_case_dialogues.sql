-- Persistent case assistant conversations and isolated courtroom practice.
CREATE TABLE IF NOT EXISTS jude_dialogues (
  id varchar(36) PRIMARY KEY,
  case_id varchar(36) NOT NULL REFERENCES jude_cases(id) ON DELETE CASCADE,
  kind varchar(20) NOT NULL,
  title varchar(160) NOT NULL,
  mode varchar(20) NOT NULL DEFAULT 'ai',
  conditions json NOT NULL DEFAULT '{}',
  status varchar(20) NOT NULL DEFAULT 'active',
  created_at varchar(40) NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_jude_dialogues_case_id ON jude_dialogues(case_id);
CREATE TABLE IF NOT EXISTS jude_dialogue_messages (
  id varchar(36) PRIMARY KEY,
  dialogue_id varchar(36) NOT NULL REFERENCES jude_dialogues(id) ON DELETE CASCADE,
  sequence integer NOT NULL,
  role varchar(20) NOT NULL,
  speaker varchar(80) NOT NULL,
  text text NOT NULL,
  citations json NOT NULL DEFAULT '[]',
  legal json NOT NULL DEFAULT '[]',
  notice text NOT NULL DEFAULT '',
  request_id varchar(36),
  created_at varchar(40) NOT NULL,
  UNIQUE(dialogue_id, sequence),
  UNIQUE(dialogue_id, request_id)
);
CREATE INDEX IF NOT EXISTS ix_jude_dialogue_messages_dialogue_id ON jude_dialogue_messages(dialogue_id);
ALTER TABLE jude_dialogues ENABLE ROW LEVEL SECURITY;
ALTER TABLE jude_dialogue_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON jude_dialogues, jude_dialogue_messages FROM anon, authenticated;
