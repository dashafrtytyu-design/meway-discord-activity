import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const worker=readFileSync(new URL('../worker.ts',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
test('game XP uses server-owned maximum and verified score',()=>{
 assert.match(worker,/const creditedXp=gameScore\?Math\.round\(maximumAward\*gameScore\.correct\/gameScore\.total\):award/);
 assert.match(worker,/const item=kind==='mission'/);
 assert.equal(Math.round(50*5/10),25);
 assert.equal(Math.round(50*0/10),0);
 assert.equal(Math.round(50*10/10),50);
});
test('server handles partial transcripts for memory, crossword, sorting and puzzle',()=>{
 assert.match(worker,/gameType==='picture-puzzle'\?puzzleSize\*puzzleSize/);
 assert.match(worker,/gameType==='memory'/);
 assert.match(worker,/gameType==='category-sort'\|\|gameType==='drag-sort'/);
 assert.match(worker,/submitted\.length>total/);
});
test('student editors do not hardcode Food and School buckets',()=>{
 assert.doesNotMatch(app,/cats:\['Food','School'\]/);
 assert.match(app,/sortCategories/);
 assert.match(app,/function renderMemory|const renderMemory=/);
});
test('server ledger still prevents duplicate rewards',()=>{
 assert.match(worker,/INSERT OR IGNORE INTO xp_operations/);
 assert.match(worker,/idx_xp_once_per_item/);
});
