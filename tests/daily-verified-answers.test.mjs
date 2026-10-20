import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const worker=readFileSync(new URL('../worker.ts',import.meta.url),'utf8');
test('daily answers use server-confirmed transcript counts, not completed item count',()=>{
  assert.match(worker,/CREATE TABLE IF NOT EXISTS daily_verified_answers/);
  assert.match(worker,/metric==='answers'[\s\S]*?SUM\(answer_count\)/);
  assert.match(worker,/const verifiedAnswerCount=graded\?tasks\.length:gameScore\?/);
  assert.match(worker,/INSERT OR IGNORE INTO daily_verified_answers/);
  assert.match(worker,/SELECT 1 FROM xp_operations WHERE user_id=\? AND operation_id=\? AND kind=\? AND item_id=\? AND created_at=\?/);
});
