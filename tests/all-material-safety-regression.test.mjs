import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../worker.ts',import.meta.url),'utf8');
test('legacy date filter never hides D1 games',()=>assert.doesNotMatch(s,/if\(x\.section==='games'&&String\(/));
test('backup restore does not use destructive replace',()=>{const x=s.slice(s.indexOf("if (url.pathname === '/api/admin/import'"),s.indexOf("if (url.pathname === '/api/admin/bootstrap'"));assert.doesNotMatch(x,/INSERT OR REPLACE|DELETE FROM/);assert.match(x,/INSERT OR IGNORE INTO content/);assert.match(x,/INSERT OR IGNORE INTO missions/)});
test('image and all content fields verified exactly against D1',()=>assert.match(s,/verified\.data!==data/));
test('mission edit has atomic version history',()=>{assert.match(s,/CREATE TABLE IF NOT EXISTS mission_history/);assert.match(s,/MISSION_VERSION_CONFLICT/);assert.match(s,/UPDATE missions SET data=\?,updated_at=\? WHERE id=\? AND updated_at=\?/)});
test('content conflict and no accidental recreation',()=>{assert.match(s,/CONTENT_VERSION_CONFLICT/);assert.match(s,/CONTENT_NOT_FOUND/)});
