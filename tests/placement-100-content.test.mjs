import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const bankSource=readFileSync(new URL('../src/placementBank.ts',import.meta.url),'utf8')
const json=bankSource.slice(bankSource.indexOf(' = ')+3).trim()
const bank=JSON.parse(json)
const worker=readFileSync(new URL('../worker.ts',import.meta.url),'utf8')
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8')
const scoring=readFileSync(new URL('../src/placement.ts',import.meta.url),'utf8')
const levels=['A1','A2','B1','B2','C1','C2']

test('Five unique MEWAY Placement Test forms are bundled for offline answering',()=>{
 assert.deepEqual(Object.keys(bank),['1','2','3','4','5'])
 const ids=new Set(),prompts=new Set()
 for(let form=1;form<=5;form++){
  const questions=bank[form]
  assert.equal(questions.length,100)
  for(const q of questions){
   assert.ok(!ids.has(q.id),'Unique item id')
   assert.ok(!prompts.has(q.q),'No repeated question wording across forms')
   ids.add(q.id);prompts.add(q.q)
   assert.ok(levels.includes(q.level))
   assert.ok(q.topic.trim().length>0)
   assert.equal(q.options.length,4)
   assert.equal(new Set(q.options).size,4)
   assert.ok(q.options.includes(q.answer),'Correct answer included')
  }
 }
 assert.equal(prompts.size,500)
})

test('Each section has 50 questions with concealed mixed CEFR A1–C2 levels',()=>{
 for(const questions of Object.values(bank)){
  assert.ok(questions.slice(0,50).every(q=>q.domain==='Grammar'))
  assert.ok(questions.slice(50).every(q=>q.domain==='Vocabulary'))
  for(const part of [questions.slice(0,50),questions.slice(50)]){
   for(const level of levels)assert.ok(part.filter(q=>q.level===level).length>=6)
   for(let i=1;i<part.length;i++)assert.notEqual(part[i-1].level,part[i].level,'no adjacent identical level')
  }
 }
})

test('Admin supports 100-question forms with server-side validation',()=>{
 assert.match(scoring,/validatePlacementForm\(questions:unknown\)/)
 assert.match(app,/qs\.length!==100/)
 assert.match(worker,/validatePlacementForm\(questions\)/)
 assert.match(app,/50 Grammar и 50 Vocabulary/)
})

test('Placement Test phase transition and section analytics are explicit',()=>{
 assert.match(app,/if\(i===49\)\{setTransition\(true\)/)
 assert.match(app,/Перейти к Vocabulary/)
 assert.match(app,/domainBreakdown\.Grammar/)
 assert.match(app,/domainBreakdown\.Vocabulary/)
 assert.match(app,/50 грамматических заданий/)
})

test('Server owns scoring, saves only on submission, and retains idempotency',()=>{
 assert.match(worker,/evaluatePlacement\(questions,body\.answers/)
 assert.match(worker,/last\?\.submissionId===body\.submissionId/)
 assert.match(worker,/nextPlacementVariant\(last,user\.id\)/)
 assert.match(worker,/placement_history \(user_id,data,created_at\)/)
 assert.doesNotMatch(worker,/const record=\{\.\.\.body,variant/)
})
