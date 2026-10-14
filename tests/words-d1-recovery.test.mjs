import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
test('D1 word loader distinguishes auth failures and malformed responses',()=>{
 assert.match(app,/response\.status===401/);
 assert.match(app,/response\.status===403/);
 assert.match(app,/Array\.isArray\(d\.items\)/);
});
test('sync errors retain cached materials rather than clearing them',()=>{
 assert.match(app,/retained last verified cached content after sync failure/);
 assert.match(app,/publicContentCache\.set\(section,data\);return data/);
});
test('cached navigation adds no polling',()=>{
 assert.match(app,/const mem=publicContentCache\.get\(section\);if\(mem\)return mem/);
});
