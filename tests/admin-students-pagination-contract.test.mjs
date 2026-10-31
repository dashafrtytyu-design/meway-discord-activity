import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const worker=readFileSync(new URL('../worker.ts',import.meta.url),'utf8')
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8')
test('admin directory uses bounded keyset pagination and search',()=>{
  assert.match(worker,/Math\.min\(60,Math\.max\(10/)
  assert.match(worker,/p\.updated_at < \? OR \(p\.updated_at = \? AND p\.user_id < \?\)/)
  assert.match(worker,/ORDER BY p\.updated_at DESC,p\.user_id DESC LIMIT \?/)
  assert.match(worker,/LOWER\(COALESCE\(json_extract\(p\.data,'\$\.nickname'\)/)
  assert.match(app,/Показать ещё 40 учеников/)
})
test('student details only load on demand and student access persists in D1 with audit',()=>{
  assert.match(worker,/const detailMatch=url\.pathname\.match/)
  assert.match(worker,/SELECT data,created_at FROM placement_history WHERE user_id=\? ORDER BY id DESC LIMIT 50/)
  assert.match(app,/api\/admin\/students\/\$\{userId\}\/details/)
  assert.match(worker,/INSERT INTO admin_audit \(actor_id,user_id,action,detail,created_at\)/)
  assert.match(worker,/body\.replace===true/)
  assert.match(app,/JSON\.stringify\(\{levels,replace:true\}\)/)
})
test('no continuous polling or bulk historical student loading',()=>{
  const directory=worker.split("if (url.pathname === '/api/admin/students' && request.method === 'GET')")[1].split('const detailMatch=')[0]
  assert.doesNotMatch(directory,/SELECT user_id,data,created_at FROM placement_history/)
  assert.doesNotMatch(directory,/SELECT user_id, data, updated_at FROM progress/)
  assert.match(app,/showIncidents&&<ServerIncidents/)
})
