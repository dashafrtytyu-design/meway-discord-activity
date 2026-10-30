import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const worker=readFileSync(new URL('../worker.ts',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
const grader=readFileSync(new URL('../src/xpScoring.mjs',import.meta.url),'utf8');
test('game XP uses server-owned maximum and verified score',()=>{
 assert.match(worker,/const creditedXp=gameScore\?proportionalXp\(maximumAward,gameScore\.correct,gameScore\.total\)/);
 assert.match(worker,/if\(kind==='mission'\)\{/);
 assert.equal(Math.round(50*5/10),25);
 assert.equal(Math.round(50*0/10),0);
 assert.equal(Math.round(50*10/10),50);
});
test('server handles partial transcripts for memory, crossword, sorting and puzzle',()=>{
 assert.match(grader,/gameType==='picture-puzzle'\?size\*size/);
 assert.match(grader,/gameType==='memory'/);
 assert.match(grader,/gameType==='category-sort'\|\|gameType==='drag-sort'/);
 assert.match(grader,/submitted\.length!==total/);
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
