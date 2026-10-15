import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const src = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
test('duplicate headwords are allowed without scanning the entire dictionary or blocking save', () => {
  assert.match(src, /function WordsEditor\(/);
  assert.doesNotMatch(src, /duplicateFor\(i,w\.en/);
  assert.doesNotMatch(src, /window\.confirm\(`Эти слова уже встречаются/);
  assert.match(src, /Повторения слов разрешены/);
});
test('large word sets render a bounded page without dropping unsaved words', () => {
  assert.match(src, /const PAGE_SIZE=20/);
  assert.match(src, /visibleWords=words\.slice\(start,start\+PAGE_SIZE\)/);
  assert.match(src, /payload\('words',\(latest:any\)=>/);
  assert.match(src, /const i=start\+offset/);
});
test('save awaits image conversions and server acknowledgement', () => {
  assert.match(src, /await awaitMaterialImages\(\)/);
  assert.match(src, /const ok=await onSave\(candidate\)/);
  assert.match(src, /if\(!ok\)setSaveError/);
});
