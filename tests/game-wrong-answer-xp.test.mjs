import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(
  new URL('../src/App.tsx', import.meta.url),
  'utf8'
);

test('Word Builder sends no correct answer after a mistake', () => {
  assert.match(
    app,
    /<WordBuilder\b[^>]*finish=\{\(ok\)=>finishRound\(ok,ok\?String\(words\[round%words\.length\]\?\.en\|\|''\):''\)\}/
  );
});

test('Sentence Order sends no correct answer after a mistake', () => {
  assert.match(
    app,
    /<SentenceOrder\b[^>]*finish=\{\(ok\)=>finishRound\(ok,ok\?String\(words\[round%words\.length\]\?\.hint\|\|words\[round%words\.length\]\?\.example\|\|words\[round%words\.length\]\?\.en\|\|''\):''\)\}/
  );
});
