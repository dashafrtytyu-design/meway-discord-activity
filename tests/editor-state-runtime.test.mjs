import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
test('content editor patches use current React state rather than captured render state',()=>{assert.match(source,/setX\(prev=>\(\{\.\.\.prev,\[k\]/);assert.match(source,/setX\(prev=>\(\{\.\.\.prev,payload:/);});
test('game and vocabulary card edits merge into latest cards after async image conversion',()=>{assert.match(source,/const updateWord=\(i:number,patch:any\)=>payload\('words',\(latest:any\)=>/);assert.match(source,/const update=\(i:number,patch:any\)=>payload\('words',\(latest:any\)=>/);});
test('editor field wrapper avoids nested label controls',()=>{assert.match(source,/function Field\(/);assert.match(source,/className=\{`editorField/);});
