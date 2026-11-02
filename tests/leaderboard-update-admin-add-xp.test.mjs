import {test} from 'node:test'
import {strict as assert} from 'node:assert'
import {readFile} from 'node:fs/promises'

const root=new URL('../',import.meta.url)
const worker=await readFile(new URL('worker.ts',root),'utf8')
const app=await readFile(new URL('src/App.tsx',root),'utf8')

test('admin-only manual XP grant accepts large safe integers and rejects invalid totals',()=>{
 const route=worker.split('const addXpMatch=')[1]?.split("const restoreMatch=")[0]||''
 assert.ok(route.length>0)
 assert.match(route,/requireAdmin\(request,env\)/)
 assert.match(route,/Number\.isSafeInteger\(amount\)/)
 assert.doesNotMatch(route,/amount>10000/)
 assert.match(route,/Number\.isSafeInteger\(nextXp\)/)
 assert.match(route,/UPDATE progress SET data=\?,updated_at=\? WHERE user_id=\? AND data=\?/ )
})

test('manual XP grant is audited, updates XP history, publishes progress and synchronises rank roles',()=>{
 const route=worker.split('const addXpMatch=')[1]?.split("const restoreMatch=")[0]||''
 assert.match(route,/xpEvents:/)
 assert.match(route,/uid,'add_xp'/)
 assert.match(route,/publishProgressSignal\(env,uid\)/)
 assert.match(route,/clearQueryCache\('leaderboard'\)/)
 assert.match(route,/syncDiscordLevelRole\(env,uid,nextXp\)/)
})

test('student administration exposes a separate Add XP action',()=>{
 assert.match(app,/\/api\/admin\/students\/\$\{s\.userId\}\/add-xp/)
 assert.match(app,/>Добавить XP<\/button>/)
})
