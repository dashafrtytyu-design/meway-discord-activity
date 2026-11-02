import {test} from 'node:test'
import {strict as assert} from 'node:assert'
import {civilDay,consecutiveActivityDays,activityCalendarCell} from '../src/activityMetrics.mjs'
test('local dates do not depend on UTC midnight',()=>{const day=new Date(2026,9,29,0,10);assert.equal(civilDay(day),'2026-10-29')})
test('today and yesterday build a streak',()=>{assert.equal(consecutiveActivityDays(['2026-10-27','2026-10-28','2026-10-29'],new Date(2026,9,29,13)),3)})
test('yesterday counts before today check-in',()=>{assert.equal(consecutiveActivityDays(['2026-10-27','2026-10-28'],new Date(2026,9,29,8)),2)})
test('a genuine missed day breaks streak',()=>{assert.equal(consecutiveActivityDays(['2026-10-26','2026-10-27'],new Date(2026,9,29,8)),0)})
test('calendar distinguishes days before first confirmed visit and missing days',()=>{assert.equal(activityCalendarCell('2026-10-20',[],'2026-10-25','2026-10-29'),'unverified');assert.equal(activityCalendarCell('2026-10-27',[],'2026-10-25','2026-10-29'),'missed');assert.equal(activityCalendarCell('2026-10-29',['2026-10-29'],'2026-10-25','2026-10-29'),'active')})
test('month and year boundaries are consecutive days',()=>{assert.equal(consecutiveActivityDays(['2026-12-31','2027-01-01'],new Date(2027,0,1,14)),2)})

test('streak keeps counting beyond the 30-day milestone',()=>{
 const days=Array.from({length:31},(_,i)=>`2026-01-${String(i+1).padStart(2,'0')}`)
 assert.equal(consecutiveActivityDays(days,new Date(2026,0,31,14)),31)
})
test('reaching day eight does not cap the streak at seven',()=>{
 const days=Array.from({length:8},(_,i)=>`2026-01-${String(i+1).padStart(2,'0')}`)
 assert.equal(consecutiveActivityDays(days,new Date(2026,0,8,14)),8)
})
test('a missed day starts a new streak from the next confirmed visit',()=>{
 assert.equal(consecutiveActivityDays(['2026-01-01','2026-01-02','2026-01-03','2026-01-05'],new Date(2026,0,5,14)),1)
})
