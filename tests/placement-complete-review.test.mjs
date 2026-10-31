import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {makePlacementAnswerOrder} from '../src/placementAnswerOrder.mjs'

const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8')
const scorer=readFileSync(new URL('../src/placement.ts',import.meta.url),'utf8')
const styles=readFileSync(new URL('../src/App.css',import.meta.url),'utf8')
const worker=readFileSync(new URL('../worker.ts',import.meta.url),'utf8')
const raw=readFileSync(new URL('../src/placementBank.ts',import.meta.url),'utf8')
const bank=JSON.parse(raw.slice(raw.indexOf(' = ')+3).trim())

test('all 500 bank questions have four unique choices and a single correct option',()=>{
 for(const qs of Object.values(bank)){
  assert.equal(qs.length,100)
  for(const q of qs){
   assert.equal(q.options.length,4)
   assert.equal(new Set(q.options).size,4)
   assert.ok(q.options.includes(q.answer))
  }
 }
})

test('all five forms shuffle locally and balance correct button positions in each 50-item section',()=>{
 for(const qs of Object.values(bank)){
  for(let run=0;run<12;run++){
   const ordered=makePlacementAnswerOrder(qs)
   assert.equal(ordered.length,100)
   for(const offset of [0,50]){
    const counts=[0,0,0,0]
    for(let i=offset;i<offset+50;i++){
     assert.deepEqual(new Set(ordered[i]),new Set(qs[i].options))
     const idx=ordered[i].indexOf(qs[i].answer)
     assert.notEqual(idx,-1)
     counts[idx]++
     if(i>0)assert.notEqual(idx,ordered[i-1].indexOf(qs[i-1].answer),'adjacent correct button positions')
    }
    assert.deepEqual([...counts].sort((a,b)=>a-b),[12,12,13,13])
   }
  }
 }
})

test('Placement Test shows all 100 questions, correct answers green and mistakes red with right answers green',()=>{
 assert.match(scorer,/review:PlacementAnswerReview\[\]/)
 assert.match(scorer,/const review:PlacementAnswerReview\[\]=questions\.map/)
 assert.match(scorer,/correct:answers\[q\.id\]===q\.answer/)
 assert.match(scorer,/weakTopics,mistakes,review,recommendation/)
 assert.match(app,/\(result\.review\|\|\[\]\)\.map/)
 assert.match(app,/n===0&&<h3>Grammar/)
 assert.match(app,/n===50&&<h3>Vocabulary/)
 assert.match(app,/m\.correct\s*\?<small className="feedbackCorrect"/)
 assert.match(app,/className="feedbackWrong">✕ Неверно/)
 assert.match(app,/className="feedbackCorrect">✓ Правильный ответ/)
 assert.match(styles,/\.app :is\(\.explain:not\(\.good\),\.feedbackWrong\)\{background:#ffebee!important;color:#812133!important/)
 assert.match(styles,/\.app :is\(\.explain.good,\.feedbackCorrect,\.correctHint\)\{background:#e0f7e9!important;color:#125d38!important/)
})

test('server recovers all response records from verified answers and does not change retake flow',()=>{
 assert.match(worker,/const calculated=evaluatePlacement\(questions,body\.answers/)
 assert.match(worker,/last\?\.submissionId===body\.submissionId/)
 assert.match(worker,/nextPlacementVariant\(last,user\.id\)/)
 assert.match(scorer,/const level=estimatePlacementLevel\(breakdown\)/)
 assert.match(scorer,/domainBreakdown\[domain\]/)
 assert.match(scorer,/lowerCorrect\/lowerTotal<0\.70/)
 assert.match(app,/makePlacementAnswerOrder\(questions\)/)
})

test('wording avoids unclear negative sentences in all five A1 grammar sets',()=>{
 const checks=[[1,1004,'plant-based'],[2,2004,'Manchester'],[3,3004,'new to me'],[4,4004,'Sundays off'],[5,5004,'Entry is free']]
 for(const [variant,id,phrase] of checks){
  const q=bank[variant].find(x=>x.id===id)
  assert.ok(q.q.includes(phrase))
  assert.equal(q.answer,"don't")
 }
})
