-- Run only on the existing meway-content production database. READ ONLY.
-- Counts D1 rows only. The app may also merge bundled curriculum items.
SELECT 'missions' AS section,
       json_extract(data,'$.level') AS level,
       COUNT(*) AS total,
       SUM(CASE WHEN json_extract(data,'$.status')='published' THEN 1 ELSE 0 END) AS published
FROM missions WHERE json_valid(data)
GROUP BY level
UNION ALL
SELECT section,
       json_extract(data,'$.level') AS level,
       COUNT(*) AS total,
       SUM(CASE WHEN json_extract(data,'$.status')='published' THEN 1 ELSE 0 END) AS published
FROM content WHERE json_valid(data)
GROUP BY section, level
ORDER BY section, level;

-- Direct diagnostic for the new progress catalog.
SELECT json_extract(data,'$.level') AS level,
       COUNT(*) AS games_in_d1,
       SUM(CASE WHEN json_extract(data,'$.status')='published' THEN 1 ELSE 0 END) AS games_published,
       SUM(CASE WHEN json_extract(data,'$.status') IS NULL THEN 1 ELSE 0 END) AS games_without_status,
       SUM(CASE WHEN json_extract(data,'$.xp') IS NOT NULL THEN 1 ELSE 0 END) AS games_with_xp
FROM content WHERE section='games' AND json_valid(data)
GROUP BY level ORDER BY level;
