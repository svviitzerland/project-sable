-- Copies of the public demo case opened before 2026-11-02 kept the long title.
BEGIN;
UPDATE jude_cases
SET title = 'Perkara Ferdy Sambo'
WHERE title = 'Perkara Ferdy Sambo — 796/Pid.B/2022/PN Jkt.Sel (catatan publik)';
COMMIT;
