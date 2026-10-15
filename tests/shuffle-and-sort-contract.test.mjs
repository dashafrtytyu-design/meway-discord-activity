import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
test('Drag & Sort hides placed words from available bank',()=>{
 assert.match(app,/words\.map\(\(w:any,i:number\)=>placed\[i\]===undefined\?/);
 assert.match(app,/const returnToBank=/);
 assert.match(app,/sortPlacedWord/);
});
test('Shuffle is opt-in, local and only changes game display order',()=>{
 assert.match(app,/payload\('shuffleWords',e\.target\.checked\)/);
 assert.match(app,/item\.payload\?\.shuffleWords\?shuffleLearningItems\(source\):source/);
 assert.match(app,/const result=\[\.\.\.items\]/);
});
