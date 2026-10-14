import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const src = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
test('duplicate words are warned about locally without blocking save', () => {
  assert.match(src, /function WordsEditor\(/);
  assert.match(src, /duplicateFor\(i,w\.en\|\|''\)/);
  assert.match(src, /повторение разрешено/);
  assert.doesNotMatch(src, /Нельзя сохранить:.*d\[0\]/);
  assert.match(src, /save=\{async\(\)=>\{if\(saving\)return;setSaveError\(''\);setSaving\(true\)/);
});
