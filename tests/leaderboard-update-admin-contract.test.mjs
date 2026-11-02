import {test} from 'node:test'
import {strict as assert} from 'node:assert'
import {readFile} from 'node:fs/promises'

const root=new URL('../',import.meta.url)
const worker=await readFile(new URL('worker.ts',root),'utf8')
const app=await readFile(new URL('src/App.tsx',root),'utf8')
const css=await readFile(new URL('src/App.css',root),'utf8')

test('leaderboard filtering is server-side and uses the requested activity windows',()=>{
 assert.match(worker,/url\.pathname === '\/api\/leaderboard'/)
 assert.match(worker,/leaderboardWindowEligible\(mode,\{active7:x\.active7,active30:x\.active30\}\)/)
 assert.ok(app.includes('fetch(`/api/leaderboard?mode=${mode}`'))
})

test('admin can hide and restore leaderboard entries without editing student activity timestamps',()=>{
 assert.match(worker,/url\.pathname==='\/api\/admin\/leaderboard'&&request\.method==='GET'/)
 assert.match(worker,/leaderboardAdminMatch&&request\.method==='PUT'/)
 assert.match(worker,/json_set\(data,'\$\.leaderboardAdminExcluded',\?\) WHERE user_id=\?/ )
 assert.doesNotMatch(worker,/json_set\(data,'\$\.leaderboardAdminExcluded',\?\),updated_at=/)
 assert.match(app,/Убрать из рейтинга/)
 assert.match(app,/Вернуть в рейтинг/)
 assert.match(app,/tab==='leaderboard'\?/)
})

test('profile and leaderboard avatars are circular',()=>{
 assert.match(css,/\.app \.avatar, \.app \.bigAvatar, \.app \.avatarPreview img, \.app \.studentAvatar\{[\s\S]*?border-radius:50%!important;/)
})
