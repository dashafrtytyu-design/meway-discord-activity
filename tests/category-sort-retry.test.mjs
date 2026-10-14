import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
test('category names are normalized and deduplicated',()=>{
  const normalize=(value)=>String(value??'').trim().replace(/\s+/g,' ').toLocaleLowerCase();
  const seen=new Set();
  const unique=['Вещи',' вещи ','ВЕЩИ','Приветствия','Приветствия  '].map(v=>v.trim().replace(/\s+/g,' ')).filter(v=>{const k=normalize(v);if(!k||seen.has(k))return false;seen.add(k);return true});
  assert.deepEqual(unique,['Вещи','Приветствия']);
  assert.match(app,/options=uniqueGameCategories\(words\.map/);
  assert.match(app,/normalizeGameCategory\(c\)===normalizeGameCategory\(w\.category\)/);
});
test('incorrect category does not unlock next round',()=>{
  assert.match(app,/type!=='category-sort'\|\|isCorrectOption\(picked,target,options\)/);
  assert.match(app,/Неверная категория\. Попробуй ещё раз/);
  assert.match(app,/if\(picked&&type==='category-sort'&&isCorrectOption\(picked,target,options\)\)return/);
});
