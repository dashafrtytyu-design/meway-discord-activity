import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8')
const worker=readFileSync(new URL('../worker.ts',import.meta.url),'utf8')
test('admin list uses authoritative D1 XP and renders the server level',()=>{
  assert.match(worker,/json_extract\(p\.data,'\$\.xp'\)/)
  assert.match(worker,/levelForXp\(xp\)/)
  assert.match(app,/Number\(s\.xp\|\|0\)\.toLocaleString\('ru-RU'\)/)
  assert.match(app,/\{s\.level\}/)
})
test('admin refreshes student directory manually with visible errors',()=>{
  assert.match(app,/Обновить учеников/)
  assert.match(app,/cache:'no-store'/)
  assert.match(app,/setError\(`Не удалось загрузить учеников/)
})
test('directory pages do not fetch all student details or entire curriculum',()=>{
  const directory=worker.split("if (url.pathname === '/api/admin/students' && request.method === 'GET')")[1].split('const detailMatch=')[0]
  assert.match(directory,/LIMIT \?/)
  assert.match(directory,/nextCursor/)
  assert.doesNotMatch(directory,/listMissions|listContent|placement_history/)
  assert.match(worker,/WHERE user_id=\? ORDER BY id DESC LIMIT 50/)
})
