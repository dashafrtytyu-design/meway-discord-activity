import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8')
const worker=readFileSync(new URL('../worker.ts',import.meta.url),'utf8')
test('admin student list shows server XP and level',()=>{
  assert.match(app,/Number\(s\.xp\|\|0\)\.toLocaleString\("ru-RU"\)/)
  assert.match(app,/s\.level\|\|"Уровень не определён"/)
})
test('admin has manual XP refresh with error handling',()=>{
  assert.match(app,/Обновить XP учеников/)
  assert.match(app,/cache:'no-store'/)
  assert.match(app,/xpLoadError/)
})
test('admin XP values come from D1 progress, not client estimates',()=>{
  assert.match(worker,/SELECT user_id, data, updated_at FROM progress ORDER BY updated_at DESC/)
  assert.match(worker,/const xp=Math\.max\(0,Number\(d\.xp\)\|\|0\)/)
})
