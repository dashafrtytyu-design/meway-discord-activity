import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const worker=readFileSync(new URL('../worker.ts',import.meta.url),'utf8')
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8')
const words=JSON.parse(readFileSync(new URL('../public/curriculum-words.json',import.meta.url),'utf8'))
test('word curriculum asset contains only word sections',()=>{
 assert.ok(words.length>0)
 assert.ok(words.every(x=>x.section==='words'))
})
test('Worker loads generated curriculum by section',()=>{
 assert.match(worker,/curriculum-\$\{section\}\.json/)
 assert.match(worker,/loadGeneratedContent\(env,section\)/)
})
test('admin refreshes cached sections and diagnoses invalid HTTP responses',()=>{
 assert.doesNotMatch(app,/if\(cached\)\{setContent\(prev=>\[\.\.\.prev\.filter\(x=>x\.section!==sec\),\.\.\.cached\]\);return\}/)
 assert.match(app,/cache:'no-store'/)
 assert.match(app,/Некорректный список материалов/)
})
