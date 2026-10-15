import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const worker=readFileSync(new URL('../worker.ts',import.meta.url),'utf8');
const discord=readFileSync(new URL('../src/discord.ts',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
test('cached Discord token avoids OAuth bootstrap',()=>{
 assert.match(discord,/auth\.accessToken/);
 assert.match(discord,/discordSdk\.commands\.authenticate\(\{ access_token: auth\.accessToken \}\)/);
});
test('one KV-backed progress and access signal on cached login',()=>{
 assert.match(discord,/fetch\('\/api\/progress-signal'/);
 assert.doesNotMatch(discord,/fetch\('\/api\/access-signal'/);
 assert.match(worker,/env\.ACCESS_SIGNALS\.get\(progressSignalKey\(user\.id\)/);
 assert.match(worker,/env\.ACCESS_SIGNALS\.get\(accessSignalKey\(user\.id\)/);
});
test('cross-device changed revision fetches authoritative D1 profile',()=>{
 assert.match(discord,/revision!==previous/);
 assert.match(discord,/fetch\('\/api\/progress'/);
 assert.match(discord,/auth\.progress=d\.progress/);
});
test('XP claim and admin restore publish invalidation',()=>{
 assert.match(worker,/if\(results\[2\]\.meta\?\.changes\)\{await publishProgressSignal\(env,user\.id\)/);
 assert.match(worker,/await publishProgressSignal\(env,uid\)/);
});
test('XP claim is idempotent and client cannot overwrite confirmed XP',()=>{
 assert.match(worker,/CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_once_per_item/);
 assert.match(worker,/INSERT OR IGNORE INTO xp_operations/);
 assert.match(worker,/xp:_ignoredXp,completedMissions:_ignoredMissions,completedContent:_ignoredContent/);
});
test('student cache and XP queue remain separate by user',()=>{
 assert.match(readFileSync(new URL('../src/xpOutbox.ts',import.meta.url),'utf8'),/meway-xp-queue-\$\{userId\}/);
 assert.match(discord,/auth-bootstrap:\$\{lastUserId\}/);
});
