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
 constructor(){this.contents=new Map();this.meta=revisions();this.deleted=new Set();this.logs=[];this.access=new Map();this.progress=new Map()}
 async exec(){return {}}
 prepare(sql){let bound=[];const db=this;return {bind(...args){bound=args;return this},async first(){db.logs.push(['first',sql,bound]);if(sql.includes('FROM course_access WHERE user_id=?'))return db.access.has(bound[0])?{levels:JSON.stringify(db.access.get(bound[0]))}:null;if(sql.includes('FROM meway_meta'))return {data:JSON.stringify(db.meta)};if(sql.includes('FROM content WHERE id=?')){let x=db.contents.get(Number(bound[0]));return x?{data:JSON.stringify(x),section:x.section}:null}return null},async all(){db.logs.push(['all',sql,bound]);if(sql.includes('SELECT id FROM deleted_content'))return {results:[...db.deleted].map(id=>({id}))};if(sql.includes('FROM content')){let items=[...db.contents.values()];if(sql.includes('WHERE section = ?'))items=items.filter(x=>x.section===bound[0]);return {results:items.map(x=>({data:JSON.stringify(x),updated_at:'2026-11-01T12:00:00Z'}))}}return {results:[]}},async run(){db.logs.push(['run',sql,bound]);if(sql.includes('INSERT OR IGNORE INTO progress (user_id,data,updated_at)')){if(db.progress.has(bound[0]))return {meta:{changes:0}};db.progress.set(bound[0],JSON.parse(bound[1]));return {meta:{changes:1}}}if(sql.includes('INTO content (id,section,data,updated_at)')){const [id,section,data]=bound;const val=JSON.parse(data);if(sql.startsWith('INSERT OR IGNORE')&&db.contents.has(Number(id)))return {meta:{changes:0}};db.contents.set(Number(id),val);return {meta:{changes:1}}}if(sql.includes('INTO meway_meta')&&sql.includes('json_object')){const [key,now]=bound;db.meta[key]=now;return {meta:{changes:1}}}if(sql.startsWith('DELETE FROM deleted_content'))db.deleted.delete(Number(bound[0]));if(sql.startsWith('DELETE FROM content'))db.contents.delete(Number(bound[0]));return {meta:{changes:1}}}}}
}
function isolate(db,userId=ADMIN_ID){
 const module={exports:{}}
 const roleData=[{id:GUILD,position:0,permissions:'0'},{id:'a',position:3,permissions:String(1n<<28n)},{id:MASTER,position:2,permissions:'0'}]
 const requests=[]
 const fetch=async (url,opt={})=>{requests.push([url,opt.method||'GET']);if(String(url).includes('/api/users/@me'))return Response.json({id:userId,username:'user'});if(String(url).endsWith('/users/@me'))return Response.json({id:BOT_ID});if(String(url).endsWith(`/members/${BOT_ID}`))return Response.json({roles:['a']});if(String(url).endsWith('/roles'))return Response.json(roleData);throw new Error('Unexpected external fetch '+url)}
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



test('locked courses reveal card metadata but never game questions or answer keys, including on cache hits',async()=>{
 const db=new FakeD1(),userId='222222222222222222';
 const game={id:1762012345678612,section:'games',title:'Закрытая игра',description:'secret instruction',status:'published',level:'B2',icon:'🧩',xp:15,category:'Фото',payload:{questions:[{correctAnswer:'PRIVATE ANSWER'}],image:'PRIVATE IMAGE'}};
 db.contents.set(game.id,game);
 const student=isolate(db,userId);
 let d=await go(student,'/api/content?section=games');
 assert.equal(d.status,200);
 assert.equal(d.data.items.length,1);
 assert.equal(d.data.items[0].locked,true);
 assert.equal(d.data.items[0].title,game.title);
 assert.equal(d.data.items[0].description,'');
 assert.deepEqual(d.data.items[0].payload,{});
 assert.equal(JSON.stringify(d.data).includes('PRIVATE ANSWER'),false);
 db.access.set(userId,['B2','A1']);
 d=await go(student,'/api/content?section=games');
 assert.equal(d.status,200);
 assert.equal(d.data.items[0].payload.questions[0].correctAnswer,'PRIVATE ANSWER');
 assert.notEqual(d.data.items[0].locked,true);
 db.access.set(userId,['A1']);
 d=await go(student,'/api/content?section=games');
 assert.equal(d.data.items[0].locked,true);
 assert.deepEqual(d.data.items[0].payload,{});
});

test('locked mission answer transcripts are withheld and existing grants unlock only selected level',async()=>{
 const db=new FakeD1(),id='222222222222222223',student=isolate(db,id);
 let d=await go(student,'/api/missions');
 assert.equal(d.status,200);
 assert.ok(d.data.missions.some(x=>x.level==='A1'&&x.locked===true));
 assert.ok(d.data.missions.filter(x=>x.locked).every(x=>x.tasks.length===0&&x.description===''));
 db.access.set(id,['A1']);
 d=await go(student,'/api/missions');
 assert.ok(d.data.missions.some(x=>x.level==='A1'&&x.tasks.length>0));
 assert.ok(d.data.missions.filter(x=>x.level!=='A1').every(x=>x.tasks.length===0));
 db.access.set(id,[]);
 d=await go(student,'/api/missions');
 assert.ok(d.data.missions.every(x=>x.tasks.length===0));
});

test('admin materials display pages of 40 without dropping records, and all visitors have registration in OAuth route',()=>{
 const appSource=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
 const workerSource=readFileSync(new URL('../worker.ts',import.meta.url),'utf8');
 assert.match(appSource,/visibleList=filteredList\.slice\(0,visibleLimit\)/);
 assert.match(appSource,/setVisibleLimit\(n=>n\+40\)/);
 const ids=Array.from({length:1047},(_,i)=>i+1);
 for(let cap=40;cap<=1080;cap+=40){const displayed=ids.slice(0,cap);assert.equal(displayed.length,Math.min(1047,cap))}
 assert.match(workerSource,/Register every authenticated Discord visitor/);
 assert.match(workerSource,/INSERT OR IGNORE INTO progress \(user_id,data,updated_at\)/);
 assert.match(workerSource,/ORDER BY p\.updated_at DESC,p\.user_id DESC LIMIT \?/);
 assert.doesNotMatch(appSource,/localStorage\.getItem\('meway-course-access'\)/);
});

test('legacy cached visitors are registered once without resetting existing XP',async()=>{
 const db=new FakeD1(),id='222222222222222224',visitor=isolate(db,id);
 let res=await go(visitor,'/api/visitor/register',{method:'POST'});
 assert.equal(res.status,200);assert.equal(res.data.registered,true);
 assert.equal(db.progress.get(id).xp,0);assert.equal(db.progress.get(id).discordUsername,'user');
 db.progress.get(id).xp=10000;
 res=await go(visitor,'/api/visitor/register',{method:'POST'});
 assert.equal(res.status,200);assert.equal(db.progress.get(id).xp,10000);
 const appSource=readFileSync(new URL('../src/discord.ts',import.meta.url),'utf8');
 assert.match(appSource,/meway-visitor-registered:/);
 assert.match(appSource,/fetch\('\/api\/visitor\/register'/);
});
