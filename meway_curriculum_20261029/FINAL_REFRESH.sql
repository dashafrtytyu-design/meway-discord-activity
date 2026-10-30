-- Execute ONLY after all 12 ADD_*.sql files succeed.
-- Invalidate catalog revisions without replacing any other metadata fields.
UPDATE meway_meta SET
 data=json_set(data,'$.missions',strftime('%Y-%m-%dT%H:%M:%fZ','now'),'$.quizzes',strftime('%Y-%m-%dT%H:%M:%fZ','now'),'$.challenges',strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE id=1 AND json_valid(data);
SELECT 'missions' section,COUNT(*) count FROM missions WHERE id BETWEEN 760100000000001 AND 760100000000350
UNION ALL SELECT 'quizzes',COUNT(*) FROM content WHERE section='quizzes' AND id BETWEEN 760200000000001 AND 760200000000350
UNION ALL SELECT 'challenges',COUNT(*) FROM content WHERE section='challenges' AND id BETWEEN 760300000000001 AND 760300000000350;
