import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {runInNewContext} from 'node:vm'
const require=createRequire(import.meta.url)
const ts=require('typescript')
const source=readFileSync(new URL('../worker.ts',import.meta.url),'utf8')
const javascript=ts.transpileModule(source,{fileName:'worker.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const revisions=()=>({missions:'0',games:'0',quizzes:'0',words:'0',challenges:'0',rewards:'0',settings:'0'})
const ADMIN_ID='123'; const GUILD='987';const BOT_ID='654';const MASTER='1555241516363030568'
class FakeD1 {
 constructor(){this.contents=new Map();this.meta=revisions();this.deleted=new Set();this.logs=[]}
 async exec(){return {}}
 prepare(sql){let bound=[];const db=this;return {bind(...args){bound=args;return this},async first(){db.logs.push(['first',sql,bound]);if(sql.includes('FROM meway_meta'))return {data:JSON.stringify(db.meta)};if(sql.includes('FROM content WHERE id=?')){let x=db.contents.get(Number(bound[0]));return x?{data:JSON.stringify(x),section:x.section}:null}return null},async all(){db.logs.push(['all',sql,bound]);if(sql.includes('SELECT id FROM deleted_content'))return {results:[...db.deleted].map(id=>({id}))};if(sql.includes('FROM content')){let items=[...db.contents.values()];if(sql.includes('WHERE section = ?'))items=items.filter(x=>x.section===bound[0]);return {results:items.map(x=>({data:JSON.stringify(x),updated_at:'2026-11-01T12:00:00Z'}))}}return {results:[]}},async run(){db.logs.push(['run',sql,bound]);if(sql.includes('INTO content (id,section,data,updated_at)')){const [id,section,data]=bound;const val=JSON.parse(data);if(sql.startsWith('INSERT OR IGNORE')&&db.contents.has(Number(id)))return {meta:{changes:0}};db.contents.set(Number(id),val);return {meta:{changes:1}}}if(sql.includes('INTO meway_meta')&&sql.includes('json_object')){const [key,now]=bound;db.meta[key]=now;return {meta:{changes:1}}}if(sql.startsWith('DELETE FROM deleted_content'))db.deleted.delete(Number(bound[0]));if(sql.startsWith('DELETE FROM content'))db.contents.delete(Number(bound[0]));return {meta:{changes:1}}}}}
}
function isolate(db){
 const module={exports:{}}
 const roleData=[{id:GUILD,position:0,permissions:'0'},{id:'a',position:3,permissions:String(1n<<28n)},{id:MASTER,position:2,permissions:'0'}]
 const requests=[]
 const fetch=async (url,opt={})=>{requests.push([url,opt.method||'GET']);if(String(url).includes('/api/users/@me'))return Response.json({id:ADMIN_ID,username:'admin'});if(String(url).endsWith('/users/@me'))return Response.json({id:BOT_ID});if(String(url).endsWith(`/members/${BOT_ID}`))return Response.json({roles:['a']});if(String(url).endsWith('/roles'))return Response.json(roleData);throw new Error('Unexpected external fetch '+url)}
 const fakeRequire=id=>{
  if(id.endsWith('buildVersion'))return {MEWAY_BUILD_ID:'test'}
  if(id.endsWith('placement'))return {placementVariants:[],evaluatePlacement:()=>{},nextPlacementVariant:()=>{},validatePlacementForm:()=>{}}
  if(id.endsWith('xpScoring.mjs'))return {gradeGameAnswers:()=>{},proportionalXp:()=>{}}
  throw new Error(id)
 }
 const context={exports:module.exports,module,require:fakeRequire,console,Date,BigInt,Set,Map,JSON,Number,Math,Array,String,Promise,TextEncoder,Request,Response,URL,URLSearchParams,crypto:globalThis.crypto,fetch,caches:{open:async()=>({put:async()=>{}})}}
 const factory=runInNewContext(`(function(require,module,exports){${javascript}\n})`,context)
 factory(fakeRequire,module,module.exports)
 const env={DB:db,ASSETS:{fetch:async()=>Response.json([])},DISCORD_CLIENT_ID:'999',DISCORD_CLIENT_SECRET:'secret-test-only',ADMIN_DISCORD_ID:ADMIN_ID,DISCORD_BOT_TOKEN:'fake-bot-token',DISCORD_GUILD_ID:GUILD}
 const ctx={waitUntil:()=>{}}
 return {app:module.exports.default,env,ctx,requests}
}
const auth={'Authorization':'Bearer fake-oauth'}
async function go(worker,path,options={}){const r=await worker.app.fetch(new Request('https://test.example'+path,{...options,headers:{...auth,...options.headers}}),worker.env,worker.ctx);return {status:r.status,data:await r.json()}}

test('content creates, edits and appears for student in a different warm Cloudflare isolate',async()=>{
 const db=new FakeD1(),one=isolate(db),two=isolate(db)
 let d=await go(one,'/api/content?section=games');assert.equal(d.status,200);assert.deepEqual(d.data.items,[])
 const game={id:1762012345678901,section:'games',title:'Проверка игры',description:'Demo',status:'published',level:'B2',icon:'🧩',xp:15,category:'Фото',payload:{gameType:'picture-puzzle',words:[{en:'apple',ru:'яблоко',image:'data:image/png;base64,AA=='}]}}
 d=await go(two,'/api/admin/content',{method:'POST',body:JSON.stringify(game)});assert.equal(d.status,201);assert.equal(d.data.item.title,game.title)
 d=await go(one,'/api/content?section=games');assert.equal(d.status,200);assert.equal(d.data.items.length,1)
 const changed={...game,title:'Обновлённая игра'}
 d=await go(two,`/api/admin/content/${game.id}`,{method:'PUT',body:JSON.stringify(changed)});assert.equal(d.status,200)
 d=await go(one,'/api/content?section=games');assert.equal(d.status,200);assert.equal(d.data.items[0].title,'Обновлённая игра')
 const published=await go(one,'/api/content-signal');assert.equal(published.data.revisions.games,db.meta.games)
})
test('D1 2 MB row limit returns friendly 413 without writing game',async()=>{
 const db=new FakeD1(),app=isolate(db)
 const game={id:1762012345678930,section:'games',title:'Тест большого фото',status:'published',level:'A1',payload:{image:'A'.repeat(2_000_000)}}
 const d=await go(app,'/api/admin/content',{method:'POST',body:JSON.stringify(game)})
 assert.equal(d.status,413);assert.equal(d.data.code,'D1_ROW_TOO_LARGE');assert.equal(db.contents.size,0)
})
test('read-only admin role diagnostic detects bot rights without changing roles',async()=>{
 const db=new FakeD1(),app=isolate(db)
 const d=await go(app,'/api/admin/role-health')
 assert.equal(d.status,200);assert.equal(d.data.ready,true);assert.equal(d.data.masterZoneFound,true);assert.equal(d.data.botOnlineNotRequired,true)
 assert.equal(app.requests.filter(x=>x[1]!=='GET').length,0)
})

test('drafts never appear to students; publishing existing draft updates catalog',async()=>{
 const db=new FakeD1(),student=isolate(db),admin=isolate(db)
 const item={id:1762012345678300,section:'games',title:'Черновик игры',status:'draft',level:'B1',payload:{gameType:'word-match',words:[]}}
 let d=await go(admin,'/api/admin/content',{method:'POST',body:JSON.stringify(item)});assert.equal(d.status,201)
 d=await go(student,'/api/content?section=games');assert.equal(d.data.items.length,0)
 d=await go(admin,`/api/admin/content/${item.id}`,{method:'PUT',body:JSON.stringify({...item,status:'published'})});assert.equal(d.status,200)
 d=await go(student,'/api/content?section=games');assert.equal(d.data.items.length,1)
})

test('missing Cloudflare bot token is diagnosed, without modifying XP or roles',async()=>{
 const db=new FakeD1(),w=isolate(db);delete w.env.DISCORD_BOT_TOKEN
 const d=await go(w,'/api/admin/role-health');assert.equal(d.status,200);assert.equal(d.data.ready,false)
 assert.match(d.data.issues.join(' '),/DISCORD_BOT_TOKEN/)
 assert.equal(w.requests.filter(([url])=>String(url).includes('guilds')).length,0)
})

test('compact admin content list excludes image payload and full editor load retains it',async()=>{
 const db=new FakeD1(),app=isolate(db)
 const item={id:1762012345678701,section:'games',title:'New puzzle',status:'published',level:'B2',xp:15,category:'Фото',icon:'🧩',payload:{gameType:'picture-puzzle',words:[{en:'apple',ru:'яблоко',image:'data:image/png;base64,'+'A'.repeat(24000)}]}}
 let d=await go(app,'/api/admin/content',{method:'POST',body:JSON.stringify(item)});assert.equal(d.status,201)
 d=await go(app,'/api/admin/content?section=games&compact=1')
 assert.equal(d.status,200);assert.equal(d.data.items.length,1)
 assert.equal(d.data.items[0].title,item.title)
 assert.deepEqual(d.data.items[0].payload,{})
 assert.ok(JSON.stringify(d.data).length<JSON.stringify(item).length/10,'summary should be small')
 d=await go(app,`/api/admin/content/${item.id}?section=games`)
 assert.equal(d.status,200);assert.equal(d.data.item.payload.words[0].image,item.payload.words[0].image)
})

test('a compact admin bootstrap contains no full mission tasks or content payload',async()=>{
 const db=new FakeD1(),app=isolate(db)
 const d=await go(app,'/api/admin/bootstrap?compact=1')
 assert.equal(d.status,200);assert.equal(d.data.ok,true)
 assert.ok(Array.isArray(d.data.missions))
 assert.ok(d.data.missions.every(m=>Array.isArray(m.tasks)&&m.tasks.length===0))
 assert.deepEqual(d.data.items,[])
})

test('admin UI lists only a bounded first window and fetches complete editor content when requested',()=>{
 const appSource=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8')
 assert.match(appSource,/visibleList=filteredList\.slice\(0,visibleLimit\)/)
 assert.match(appSource,/Показать ещё 40 материалов/)
 assert.match(appSource,/\/api\/admin\/content\/\$\{x\.id\}\?section=/)
 assert.match(appSource,/api\/admin\/bootstrap\?compact=1/)
 assert.match(appSource,/fetch\(`\/api\/admin\/content\?section=\$\{encodeURIComponent\(sec\)\}&compact=1`/)
})
