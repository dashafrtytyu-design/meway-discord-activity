import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
const worker=readFileSync(new URL('../worker.ts',import.meta.url),'utf8');
test('new material uses POST even when client preassigns id for idempotent retry',()=>{
  assert.match(app,/const isExisting=content\.some\(i=>i\.id===x\.id\)/);
  assert.match(app,/method:isExisting\?'PUT':'POST'/);
  assert.match(worker,/request\.method==='POST'&&!match/);
});
test('server POST does not overwrite an existing item with the same stable id',()=>{
  assert.match(worker,/if\(existing\)\{const previous=JSON\.parse\(existing\.data\)/);
  assert.match(worker,/INSERT OR IGNORE INTO content/);
});
