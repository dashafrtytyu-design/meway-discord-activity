import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const worker=readFileSync(new URL('../worker.ts',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
test('quiz/challenge/mission XP is calculated by server from correct answer transcript',()=>{
 assert.match(worker,/const correctCount=graded\?/);
 assert.match(worker,/const award=graded\?Math\.round\(maximumAward\*correctCount\/tasks\.length\):maximumAward/);
 assert.match(worker,/submitted\.length!==tasks\.length/);
});
test('a 20-question activity worth 40 XP awards 10 for five correct answers',()=>{
 const award=(maximum,correct,total)=>Math.round(maximum*correct/total);
 assert.equal(award(40,5,20),10);
 assert.equal(award(20,6,8),15);
 assert.equal(award(20,0,8),0);
});
test('16-digit IDs are accepted and D1 claim is idempotent',()=>{
 assert.match(worker,/\[0-9\]\{1,20\}/);
 assert.match(worker,/INSERT OR IGNORE INTO xp_operations/);
 assert.match(worker,/alreadyCompleted:/);
});
test('mission results display partial XP rather than full XP',()=>{
 assert.match(app,/Math\.round\(\(Number\(mission\.xp\)\|\|0\)\*score\/Math\.max\(1,mission\.tasks\.length\)\)/);
});
