import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const worker=readFileSync(new URL('../worker.ts',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
test('bundled demo word cards never replace admin-authored A1 word collections',()=>{
 assert.match(worker,/for\(const x of builtInContent\) if\(x\.section!=='words'/);
 assert.match(worker,/for\(const x of generated\) if\(x\.section!=='words'/);
});
test('student word loader fails visibly when D1 fails, without demo substitution',()=>{
 assert.match(app,/Не удалось получить материалы/);
 assert.match(app,/Встроенные демонстрационные карточки не подставляются/);
});
test('existing cached A1 words are not overwritten by an unexplained empty full response',()=>{
 assert.match(app,/section==='words'&&saved\.data\.length>0&&merged\.length===0/);
});
test('admin can inspect authoritative D1 word counts and image counts without writing',()=>{
 assert.match(worker,/\/api\/admin\/content-health/);
 assert.match(worker,/source:'D1'/);
 assert.match(worker,/stat\.images\+=words\.filter/);
});
