import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const worker=readFileSync(new URL('../worker.ts',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/App.css',import.meta.url),'utf8');
test('daily reward always requires five distinct server verified completions, not answers',()=>{
 assert.match(worker,/DAILY_GOAL_TARGET=5/);
 assert.match(worker,/verifiedDailyCompletions\(env,user\.id,today,activityOffset\)/);
 assert.match(worker,/SELECT COUNT\(\*\) AS n FROM xp_operations WHERE user_id=\? AND kind IN \('mission','content'\)/);
 assert.doesNotMatch(worker,/metric==='answers'[\s\S]*?SUM\(answer_count\)/);
 assert.match(worker,/const normalised=normaliseDailySettings\(value\)/);
});
test('one daily claim per user and date is enforced by D1 ledger and progress guard',()=>{
 assert.match(worker,/CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_once_per_item ON xp_operations\(user_id,kind,item_id\)/);
 assert.match(worker,/COALESCE\(json_extract\(data,'\$\.dailyClaimDate'\)/);
 assert.match(worker,/progress\.dailyStatus=dailyStatus\(today,confirmedCount,progress\)/);
 assert.match(worker,/dailyClaimDate:String\(old\.dailyClaimDate \?\? ''\)/);
});
test('daily claim waits for server-confirmation and disables claimed button',()=>{
 assert.match(app,/const opId=`daily_\$\{today\}_\$\{xpUserId\}`/);
 assert.match(app,/setDailyStatus\(progress\.dailyStatus\)/);
 assert.match(app,/className="dailyClaimDisabled" disabled aria-label="Награда за сегодня получена"/);
 assert.match(app,/5 завершённых заданий/);
 assert.doesNotMatch(app.slice(app.indexOf('const claimDaily=()=>{'),app.indexOf('const toggleLeaderboard=')),/setXp\(/);
 assert.match(css,/\.dailyMission \.dailyReward\{display:flex!important/);
});
test('stale auth requires one lazy daily status read, no polling',()=>{
 assert.match(worker,/url\.pathname==='\/api\/daily\/status'/);
 assert.match(app,/dailyStatusRequestKey\.current===`\$\{xpUserId\}:\$\{day\}`/);
 assert.match(app,/dailyStatus\?\.day===day/);
});
