import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const worker=readFileSync(new URL('../worker.ts',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
test('server accepts 13-digit Date.now IDs and retains safe bounds',()=>{
 const match=worker.match(/\/\^\[0-9\]\{1,(\d+)\}\$\/\.test\(itemId\)/);
 assert.ok(match,'numeric claim validation exists');
 const limit=Number(match[1]);
 assert.ok(limit>=13 && limit<=20);
 assert.match(worker,/xp_operations/);
});
test('XP errors are dismissible and not an always-on top banner',()=>{
 assert.match(app,/xpSyncError&&!xpNoticeDismissed/);
 assert.match(app,/Скрыть уведомление XP/);
 assert.doesNotMatch(app,/xpSyncStatus!=='synced'&&<div className="offlineBar"/);
});
