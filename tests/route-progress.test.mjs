import {test} from 'node:test'
import {strict as assert} from 'node:assert'
import {calculateLearningRoute} from '../src/learningRouteMath.mjs'
const base={missions:[{id:1,level:'A1'}],content:['quizzes','words','challenges','games'].map((section,i)=>({section,id:i+2,level:'A1'}))}
test('count all five sections and finish only when each is complete',()=>{
 const done=calculateLearningRoute(base,[1],[2,3,4,5],'A1')
 assert.equal(done.allDone,true)
 assert.equal(done.stats.games.total,1)
})
test('adding a new published item lowers the percentage without erasing progress',()=>{
 const plus={missions:[...base.missions,{id:10,level:'A1'}],content:base.content}
 const done=calculateLearningRoute(plus,[1],[2,3,4,5],'A1')
 assert.equal(done.allDone,false);assert.equal(done.stats.missions.percent,50)
})
test('missing any required section cannot complete the level',()=>{
 const minus={...base,content:base.content.filter(x=>x.section!=='games')}
 assert.equal(calculateLearningRoute(minus,[1],[2,3,4,5],'A1').allDone,false)
})
test('duplicate entries and duplicate completion IDs are not counted twice',()=>{
 const plus={...base,missions:[...base.missions,...base.missions]}
 const stats=calculateLearningRoute(plus,[1,1],[2,2,3,4,5],'A1').stats
 assert.equal(stats.missions.total,1);assert.equal(stats.missions.count,1)
})
test('never display 100 percent before actual completion',()=>{
 const d={...base,missions:Array.from({length:250},(_,i)=>({id:1000+i,level:'A1'}))}
 const r=calculateLearningRoute(d,Array.from({length:249},(_,i)=>1000+i),[2,3,4,5],'A1')
 assert.ok(r.stats.missions.percent<100);assert.equal(r.allDone,false)
})
