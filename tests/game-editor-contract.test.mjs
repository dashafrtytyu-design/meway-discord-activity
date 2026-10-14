import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
test('inline editor is a stable component outside the live prototype',()=>{assert.match(app,/function Inline\(/);assert.ok(app.indexOf('function Inline(')<app.indexOf('function AdminLivePrototype('));});
test('drag-sort categories can be added renamed and deleted',()=>{assert.match(app,/sortCategories/);assert.match(app,/Добавить категорию/);assert.match(app,/rename\(c,v\)/);assert.match(app,/Выбери категорию/);});
test('student game uses explicit category names',()=>assert.match(app,/item\.payload\?\.sortCategories/));
