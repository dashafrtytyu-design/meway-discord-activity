import {test} from 'node:test'
import {strict as assert} from 'node:assert'
import {activityWindowFlags,leaderboardWindowEligible} from '../src/leaderboardRules.mjs'

test('7-day activity is required for all-time and material boards',()=>{
 const flags=activityWindowFlags(['2026-10-29'],'2026-11-02')
 assert.equal(flags.active7,true)
 assert.equal(leaderboardWindowEligible('xp',flags),true)
 assert.equal(leaderboardWindowEligible('completed',flags),true)
})

test('activity from 8 days ago is excluded from 7 days but included in 30 days',()=>{
 const flags=activityWindowFlags(['2026-10-26'],'2026-11-02')
 assert.equal(flags.active7,false)
 assert.equal(flags.active30,true)
 assert.equal(leaderboardWindowEligible('xp7',flags),false)
 assert.equal(leaderboardWindowEligible('xp30',flags),true)
})

test('activity older than 30 days is excluded from all boards',()=>{
 const flags=activityWindowFlags(['2026-10-01'],'2026-11-02')
 assert.equal(flags.active7,false)
 assert.equal(flags.active30,false)
 assert.equal(leaderboardWindowEligible('xp',flags),false)
 assert.equal(leaderboardWindowEligible('xp30',flags),false)
})

test('invalid or future activity dates do not count',()=>{
 const flags=activityWindowFlags(['not-a-date','2026-11-03'],'2026-11-02')
 assert.equal(flags.active7,false)
 assert.equal(flags.active30,false)
 assert.equal(flags.lastActivity,'')
})
