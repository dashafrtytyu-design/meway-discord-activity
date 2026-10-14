import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const server=readFileSync(new URL('../worker.ts',import.meta.url),'utf8');
const client=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
test('content edits require server version and conditional SQL',()=>{
 assert.match(server,/CONTENT_VERSION_REQUIRED/);
 assert.match(server,/UPDATE content SET section=\?,data=\?,updated_at=\? WHERE id=\? AND updated_at=\?/);
 assert.match(server,/DELETE FROM content WHERE id=\? AND updated_at=\?/);
});
test('mission edits and deletes require server version',()=>{
 assert.match(server,/MISSION_VERSION_REQUIRED/);
 assert.match(server,/UPDATE missions SET data=\?,updated_at=\? WHERE id=\? AND updated_at=\?/);
 assert.match(server,/DELETE FROM missions WHERE id=\? AND updated_at=\?/);
});
test('client forwards versions on save and delete',()=>{
 assert.ok((client.match(/If-Unmodified-Since-MEWAY/g)||[]).length>=3);
 assert.match(server,/_serverVersion:r.updated_at/);
});
test('no automatic polling added',()=>{
 assert.doesNotMatch(client,/setInterval\(.*api\/admin/);
});
