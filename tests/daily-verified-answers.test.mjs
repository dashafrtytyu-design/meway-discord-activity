import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const worker=readFileSync(new URL('../worker.ts',import.meta.url),'utf8');
test('daily completion counts come from confirmed activity ledger, not browser answers',()=>{
  assert.match(worker,/CREATE TABLE IF NOT EXISTS daily_verified_answers/);
  assert.match(worker,/verifiedDailyCompletions\(env,user\.id,today,activityOffset\)/);
  assert.match(worker,/SELECT COUNT\(\*\) AS n FROM xp_operations WHERE user_id=\? AND kind IN \(\'mission\',\'content\'\)/);
  assert.doesNotMatch(worker,/metric===\'answers\'[\s\S]*?SUM\(answer_count\)/);
  assert.match(worker,/const verifiedAnswerCount=graded\?tasks\.length:gameScore\?/);
  assert.match(worker,/INSERT OR IGNORE INTO daily_verified_answers/);
  assert.match(worker,/SELECT 1 FROM xp_operations WHERE user_id=\? AND operation_id=\? AND kind=\? AND item_id=\? AND created_at=\?/);
});
