import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
test('mission quiz and challenge question editor remains defined', () => {
  assert.match(source, /function QuestionEditor\(/);
  assert.match(source, /function OptionalAnswers\(/);
  assert.match(source, /<QuestionEditor\b/);
});
test('obsolete unused duplicate headword helper is removed', () => {
  assert.doesNotMatch(source, /function normaliseHeadword\(/);
});
