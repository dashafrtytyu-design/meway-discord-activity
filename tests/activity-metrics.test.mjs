import {test} from 'node:test'
import {strict as assert} from 'node:assert'
import {civilDay,consecutiveActivityDays,activityCalendarCell} from '../src/activityMetrics.mjs'
test('local dates do not depend on UTC midnight',()=>{const day=new Date(2026,9,29,0,10);assert.equal(civilDay(day),'2026-10-29')})
test('today and yesterday build a streak',()=>{assert.equal(consecutiveActivityDays(['2026-10-27','2026-10-28','2026-10-29'],new Date(2026,9,29,13)),3)})
test('yesterday counts before today check-in',()=>{assert.equal(consecutiveActivityDays(['2026-10-27','2026-10-28'],new Date(2026,9,29,8)),2)})
test('a genuine missed day breaks streak',()=>{assert.equal(consecutiveActivityDays(['2026-10-26','2026-10-27'],new Date(2026,9,29,8)),0)})
test('calendar distinguishes days before first confirmed visit and missing days',()=>{assert.equal(activityCalendarCell('2026-10-20',[],'2026-10-25','2026-10-29'),'unverified');assert.equal(activityCalendarCell('2026-10-27',[],'2026-10-25','2026-10-29'),'missed');assert.equal(activityCalendarCell('2026-10-29',['2026-10-29'],'2026-10-25','2026-10-29'),'active')})
test('month and year boundaries are consecutive days',()=>{assert.equal(consecutiveActivityDays(['2026-12-31','2027-01-01'],new Date(2027,0,1,14)),2)})
