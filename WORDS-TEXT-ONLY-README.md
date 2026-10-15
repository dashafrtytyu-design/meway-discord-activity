MEWAY — text-only vocabulary, based on MEWAY_TRANSPARENT_PNG_FIX (3).zip

Changes:
- Vocabulary student cards and vocabulary editing screens do not render images or image upload controls.
- Vocabulary editor uses Russian, English, transcription and example sentence.
- Server removes image fields from vocabulary words and cover from vocabulary payload on POST/PUT. Other sections (games, quizzes, etc.) retain their images.
- Existing D1 vocabulary images are not erased merely by deploying this archive. They are removed from a given vocabulary record only when that record is saved through the modified API. Do not bulk-update D1 without explicitly accepting irreversible data loss.
- XP, missions and Discord integration are inherited from the older baseline; no claim that later bug fixes are present.

Verification: node --test tests/*.test.mjs => 29 passed. Production build not verified (dependencies unavailable locally).
