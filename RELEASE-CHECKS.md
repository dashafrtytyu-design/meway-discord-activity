# MEWAY release candidate — validation and limitations

- Preserves UI styles, images, static curriculum, and existing D1 tables.
- Mission and quiz XP claims now include full answer transcripts and are checked against server-side item definitions. A claim containing only an item ID is rejected.
- Missions and quizzes require complete, well-formed answer transcripts, including wrong answers; XP is awarded for completion, not score. This validates submitted data but is not cheat-proof: answers are shipped to the browser, and a forged transcript remains possible. Real security needs server-issued sessions, randomized tasks, and withheld answers.
- Games, word collections and manual challenges retain XP via an explicit completion flag. That flag is client-controlled and **does not prove real completion**. Daily rewards are client-side and server PUT strips XP, so daily XP is not durable. These paths require redesign and integration tests.
- Course-access API merges new levels by default. The existing admin checkbox UI sends `replace:true` to allow intentional revocation; normal A1+A2 selection is preserved.
- Integration on real Discord, two real devices, and Cloudflare D1/KV cannot be performed in this local environment.
- No destructive D1 migrations performed. Back up production D1 before deployment.

- The content XP lookup now includes games and rewards sections that were previously missing.
- Existing queued content claims without a completion flag are accepted for backwards compatibility.
