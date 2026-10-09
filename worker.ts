import { MEWAY_BUILD_ID } from './buildVersion'
import { placementVariants, PLACEMENT_RETAKE_DAYS } from './src/placement'
interface Env {
  ASSETS: Fetcher
  DB: D1Database
  ACCESS_SIGNALS?: KVNamespace
  DISCORD_CLIENT_ID: string
  DISCORD_CLIENT_SECRET?: string
  ADMIN_DISCORD_ID: string
  DISCORD_GUILD_ID?: string
  DISCORD_BOT_TOKEN?: string
}

type DiscordUser = { id: string; username: string; global_name?: string | null; avatar?: string | null }

const LEVEL_ROLES = [
  { xp: 500, id: '1554470422907723836', name: 'BEGINNER' },
  { xp: 1000, id: '1554470628818690160', name: 'LEARNER' },
  { xp: 2000, id: '1554470707629395968', name: 'ACTIVE LEARNER' },
  { xp: 3000, id: '1554470802555019325', name: 'ENGLISH EXPLORER' },
  { xp: 5000, id: '1554470911904714852', name: 'ENGLISH MASTER' },
  { xp: 10000, id: '1555241516363030568', name: 'MASTER ZONE' },
] as const

const ASSISTANT_ALERT_CHANNEL_ID = '1557072699350589522'
const UI_AUDIT_CHANNEL_ID = '1556276624738222202'
const DEFAULT_UI_CONFIG={version:1,palette:{darkText:'#F4F8FF',darkMuted:'#BFD0E2',lightText:'#082D52',lightMuted:'#55738F',accent:'#168DFF',radius:22},labels:{missions:'Миссии',quizzes:'Квизы',words:'Слова',challenges:'Челленджи'},updatedAt:''}

async function notifyAssistantUnknown(env:Env,user:DiscordUser,question:string){
  if(!env.DISCORD_BOT_TOKEN) return {ok:false,configured:false}
  const safeQuestion=question.trim().slice(0,1200)
  const userName=String(user.global_name||user.username||'Ученик').slice(0,80)
  const content=[
    `<@${env.ADMIN_DISCORD_ID}> ✈️ **MEWAY Assistant — нужен ответ менеджера**`,
    `Ассистент не нашёл уверенный ответ в локальной базе.`,
    `**Ученик:** ${userName} (Discord ID: ${user.id})`,
    `**Вопрос:** ${safeQuestion}`,
    `Зайдите в **MEWAY → Assistant → Assistant Studio**, откройте чат ученика и ответьте.`
  ].join('\n')
  try{
    const r=await fetch(`https://discord.com/api/v10/channels/${ASSISTANT_ALERT_CHANNEL_ID}/messages`,{
      method:'POST',
      headers:{Authorization:`Bot ${env.DISCORD_BOT_TOKEN}`,'Content-Type':'application/json'},
      body:JSON.stringify({content,allowed_mentions:{users:[env.ADMIN_DISCORD_ID]}})
    })
    if(!r.ok){console.error('Assistant Discord alert failed',r.status,await r.text());return {ok:false,configured:true,status:r.status}}
    return {ok:true,configured:true}
  }catch(error){console.error('Assistant Discord alert error',error);return {ok:false,configured:true}}
}

async function notifyAssistantSupport(env:Env,user:DiscordUser,message:string){
  if(!env.DISCORD_BOT_TOKEN) return {ok:false,configured:false}
  const safeMessage=message.trim().slice(0,1800)
  const userName=String(user.global_name||user.username||'Ученик').slice(0,80)
  const content=[
    `<@${env.ADMIN_DISCORD_ID}> 🛟 **MEWAY Support — новое сообщение**`,
    `**Ученик:** ${userName} (Discord ID: ${user.id})`,
    `**Сообщение:** ${safeMessage}`,
    `Ответьте в **MEWAY → Assistant → Assistant Studio**.`
  ].join('\n')
  try{
    const r=await fetch(`https://discord.com/api/v10/channels/${ASSISTANT_ALERT_CHANNEL_ID}/messages`,{method:'POST',headers:{Authorization:`Bot ${env.DISCORD_BOT_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({content,allowed_mentions:{users:[env.ADMIN_DISCORD_ID]}})})
    return {ok:r.ok,configured:true,status:r.status}
  }catch{return {ok:false,configured:true}}
}

const COURSE_ACCESS_ROLES = {
  A1: '1556913943338025012', A2: '1556914417462022245', B1: '1556914567693733938',
  B2: '1556914580851269693', C1: '1556914597192138772', C2: '1556914605039685652',
} as const
type CourseLevel = keyof typeof COURSE_ACCESS_ROLES
const COURSE_LEVELS = Object.keys(COURSE_ACCESS_ROLES) as CourseLevel[]
async function readDiscordCourseAccess(env:Env,userId:string){
  if(!env.DISCORD_BOT_TOKEN||!env.DISCORD_GUILD_ID) return [] as CourseLevel[]
  const r=await fetch(`https://discord.com/api/v10/guilds/${env.DISCORD_GUILD_ID}/members/${userId}`,{headers:{Authorization:`Bot ${env.DISCORD_BOT_TOKEN}`}})
  if(!r.ok){console.error('Course access role lookup failed',r.status);return [] as CourseLevel[]}
  const d=await r.json<any>(),roles=new Set<string>(Array.isArray(d.roles)?d.roles:[])
  return COURSE_LEVELS.filter(level=>roles.has(COURSE_ACCESS_ROLES[level]))
}
async function readCourseAccess(env:Env,userId:string,isAdmin=false){if(isAdmin)return [...COURSE_LEVELS];await ensureDb(env);const row=await env.DB.prepare('SELECT levels FROM course_access WHERE user_id=?').bind(userId).first<{levels:string}>();try{return (JSON.parse(row?.levels||'[]') as CourseLevel[]).filter(x=>COURSE_LEVELS.includes(x))}catch{return []}}
function levelForXp(xp:number){ return [...LEVEL_ROLES].reverse().find(x=>xp>=x.xp) || null }
function streakForDays(days:unknown){const set=new Set(Array.isArray(days)?days.filter((x):x is string=>typeof x==='string'):[]);let n=0,d=new Date();for(;;){const k=d.toISOString().slice(0,10);if(!set.has(k))break;n++;d.setUTCDate(d.getUTCDate()-1)}return n}
async function syncDiscordLevelRole(env:Env,userId:string,xp:number){
  if(!env.DISCORD_BOT_TOKEN||!env.DISCORD_GUILD_ID) return {ok:false,configured:false}
  const target=levelForXp(xp)
  const headers={Authorization:`Bot ${env.DISCORD_BOT_TOKEN}`}
  // Read the real Discord member state. D1 is only a cache, never the source of truth for roles.
  const member=await fetch(`https://discord.com/api/v10/guilds/${env.DISCORD_GUILD_ID}/members/${userId}`,{headers})
  if(!member.ok){console.error('Discord member lookup failed',member.status,await member.text());return {ok:false,configured:true}}
  const memberData=await member.json<any>()
  const current=new Set<string>(Array.isArray(memberData.roles)?memberData.roles:[])
  const changes:Promise<Response>[]=[]
  for(const role of LEVEL_ROLES){
    const shouldHave=role.id===target?.id
    if(current.has(role.id)&&!shouldHave) changes.push(fetch(`https://discord.com/api/v10/guilds/${env.DISCORD_GUILD_ID}/members/${userId}/roles/${role.id}`,{method:'DELETE',headers}))
    if(!current.has(role.id)&&shouldHave) changes.push(fetch(`https://discord.com/api/v10/guilds/${env.DISCORD_GUILD_ID}/members/${userId}/roles/${role.id}`,{method:'PUT',headers}))
  }
  const results=await Promise.all(changes)
  const failed=results.find(r=>!r.ok&&r.status!==404)
  if(failed){
    const errorText=await failed.text().catch(()=> '')
    console.error('Discord role sync failed',failed.status,errorText)
    return {ok:false,configured:true,role:target?.name||null,roleId:target?.id||null,status:failed.status,error:errorText||`Discord API ${failed.status}`}
  }
  return {ok:true,configured:true,role:target?.name||null,roleId:target?.id||null,changed:changes.length>0}
}

type Mission = {
  id: number; title: string; description: string; category: string; level: string
  xp: number; icon: string; duration: string; status: 'published' | 'draft' | 'archived'
  tasks: Array<{ id: number; question: string; options: string[]; correctAnswer: string; explanation: string }>
}


type MewaySettings = {
  daily:{enabled:boolean;title:string;description:string;metric:'answers'|'missions'|'materials';target:number;rewardXp:number}
  coach:{enabled:boolean;minAnswers:number;weakBelow:number;maxTopics:number;fallbackTitle:string;fallbackText:string;weakTitle:string;weakTemplate:string}
  streak:{milestones:number[]}
}
const DEFAULT_SETTINGS:MewaySettings={daily:{enabled:true,title:'5 ответов за день',description:'Ответь на задания в миссиях, играх или квизах.',metric:'answers',target:5,rewardXp:15},coach:{enabled:true,minAnswers:4,weakBelow:75,maxTopics:3,fallbackTitle:'Отличный маршрут!',fallbackText:'Продолжай проходить задания — после нескольких ответов здесь появятся персональные рекомендации.',weakTitle:'Что повторить следующим рейсом',weakTemplate:'Сфокусируйся на: {topics}'},streak:{milestones:[3,7,14,30]}}
async function getSettings(env:Env){await ensureDb(env);const hit=cachedPublic('settings') as MewaySettings|null;if(hit)return hit;const row=await env.DB.prepare('SELECT data FROM settings WHERE id = 1').first<{data:string}>();let value=DEFAULT_SETTINGS;try{if(row?.data)value={...DEFAULT_SETTINGS,...JSON.parse(row.data),daily:{...DEFAULT_SETTINGS.daily,...JSON.parse(row.data).daily},coach:{...DEFAULT_SETTINGS.coach,...JSON.parse(row.data).coach},streak:{...DEFAULT_SETTINGS.streak,...JSON.parse(row.data).streak}}}catch{}setPublic('settings',value);return value}

type ContentItem = { id: number; section: 'games'|'quizzes'|'words'|'challenges'|'rewards'; title: string; description: string; status: 'published'|'draft'|'archived'; level: string; icon: string; xp: number; category: string; payload: any }

const seed: Mission[] = [
  { id: 1, title: 'Present Simple', description: 'Проверь знания Present Simple и закрепи основные правила.', category: 'Грамматика', level: 'A1', xp: 20, icon: '📘', duration: '5 мин', status: 'published', tasks: [
    { id: 1, question: 'She ___ to school every day.', options: ['go','goes','going','gone'], correctAnswer: 'goes', explanation: 'С he, she и it в Present Simple к смысловому глаголу обычно добавляется -s.' },
    { id: 2, question: 'They ___ football on Saturdays.', options: ['plays','play','playing','played'], correctAnswer: 'play', explanation: 'С they используется основная форма глагола без окончания -s.' }
  ]},
  { id: 2, title: 'Travel Vocabulary', description: 'Полезные английские слова для путешествий.', category: 'Словарный запас', level: 'A2', xp: 30, icon: '🌍', duration: '7 мин', status: 'published', tasks: [
    { id: 1, question: 'Как переводится “luggage”?', options: ['Билет','Багаж','Самолёт','Паспорт'], correctAnswer: 'Багаж', explanation: 'Luggage означает «багаж».' }
  ]},
  { id: 3, title: 'Past Simple Challenge', description: 'Потренируй правильные и неправильные глаголы.', category: 'Грамматика', level: 'A2', xp: 35, icon: '⏳', duration: '8 мин', status: 'published', tasks: [
    { id: 1, question: 'Yesterday I ___ to the cinema.', options: ['go','went','gone','going'], correctAnswer: 'went', explanation: 'Went — форма Past Simple неправильного глагола go.' }
  ]},
]

const PRIVATE_FIELD=/^(admin|adminNotes?|internal|internalNotes?|private|secret|draftData|hiddenData|moderation|ownerOnly)$/i
function stripPrivate(value:any):any{
  if(Array.isArray(value)) return value.map(stripPrivate)
  if(value&&typeof value==='object'){const out:any={};for(const [k,v] of Object.entries(value))if(!PRIVATE_FIELD.test(k))out[k]=stripPrivate(v);return out}
  return value
}
function studentMission(m:Mission){return stripPrivate({id:m.id,title:m.title,description:m.description,category:m.category,level:m.level,xp:m.xp,icon:m.icon,duration:m.duration,status:m.status,tasks:m.tasks})}
function studentContent(x:ContentItem){return stripPrivate({id:x.id,section:x.section,title:x.title,description:x.description,status:x.status,level:x.level,icon:x.icon,xp:x.xp,category:x.category,payload:x.payload})}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=UTF-8', 'Cache-Control': 'no-store' } })
}

let dbReady = false

// Warm-isolate caches reduce repeated D1 reads and Discord identity lookups.
const publicCache = new Map<string,{expires:number,data:unknown}>()
const identityCache = new Map<string,{expires:number,user:DiscordUser}>()
const PUBLIC_TTL_MS = 10 * 60 * 1000
const APP_CONTENT_VERSION = MEWAY_BUILD_ID
type Revisions={missions:string;games:string;quizzes:string;words:string;challenges:string;rewards:string;settings:string}
const EMPTY_REVISIONS:Revisions={missions:'0',games:'0',quizzes:'0',words:'0',challenges:'0',rewards:'0',settings:'0'}
const IDENTITY_TTL_MS = 5 * 60 * 1000
// Short server-side caches reduce repeated D1 reads inside a warm Worker isolate.
// They never poll and are invalidated immediately after admin writes/progress updates.
const queryCache=new Map<string,{expires:number,data:unknown}>()
function getQueryCache<T>(key:string):T|null{const h=queryCache.get(key);if(!h||h.expires<Date.now()){queryCache.delete(key);return null}return h.data as T}
function setQueryCache(key:string,data:unknown,ttl:number){queryCache.set(key,{expires:Date.now()+ttl,data})}
function clearQueryCache(prefix?:string){for(const k of [...queryCache.keys()])if(!prefix||k.startsWith(prefix))queryCache.delete(k)}
function cachedPublic(key:string){const hit=publicCache.get(key);if(!hit||hit.expires<Date.now()){publicCache.delete(key);return null}return hit.data}
function setPublic(key:string,data:unknown){publicCache.set(key,{expires:Date.now()+PUBLIC_TTL_MS,data})}
function clearPublic(){publicCache.clear()}


async function ensureDb(env: Env) {
  if (dbReady) return
  // IMPORTANT: schema creation only. The built-in curriculum lives in the Worker bundle
  // and is never copied row-by-row into D1 on a user request. This keeps cold starts fast
  // even with thousands of MEWAY materials.
  await env.DB.exec(`
    CREATE TABLE IF NOT EXISTS missions (id INTEGER PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS content (id INTEGER PRIMARY KEY, section TEXT NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS progress (user_id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS deleted_missions (id INTEGER PRIMARY KEY, deleted_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS deleted_content (id INTEGER PRIMARY KEY, deleted_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS meway_meta (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS course_access (user_id TEXT PRIMARY KEY, levels TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS placement_results (user_id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS placement_history (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS placement_config (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS assistant_threads (user_id TEXT PRIMARY KEY, user_name TEXT NOT NULL, last_question TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS assistant_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, sender TEXT NOT NULL, kind TEXT NOT NULL, text TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_assistant_messages_user ON assistant_messages(user_id, id);
    CREATE TABLE IF NOT EXISTS assistant_knowledge (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS ui_config (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS admin_audit (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_id TEXT NOT NULL, user_id TEXT NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS server_incidents (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, user_id TEXT, message TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS xp_operations (user_id TEXT NOT NULL, operation_id TEXT NOT NULL, kind TEXT NOT NULL, item_id TEXT NOT NULL, xp INTEGER NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(user_id,operation_id));
    CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_once_per_item ON xp_operations(user_id,kind,item_id);
    CREATE TABLE IF NOT EXISTS xp_role_outbox (user_id TEXT PRIMARY KEY, updated_at TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT NOT NULL DEFAULT '');
  `)
  dbReady = true
}

async function getRevisions(env:Env):Promise<Revisions>{
  await ensureDb(env);const hit=getQueryCache<Revisions>('revisions');if(hit)return hit
  const row=await env.DB.prepare('SELECT data FROM meway_meta WHERE id=1').first<{data:string}>();let rev={...EMPTY_REVISIONS};try{if(row?.data)rev={...rev,...JSON.parse(row.data)}}catch{};setQueryCache('revisions',rev,15_000);return rev
}

// Private per-user signal in KV: never read D1 to check for access changes.
// KV is eventually consistent; a grant can take ~60 seconds to propagate.
const accessSignalKey=(id:string)=>`access:${id}`
const progressSignalKey=(id:string)=>`progress:${id}`
async function publishProgressSignal(env:Env,id:string){
  // Best-effort invalidation: D1 remains authoritative if KV is unavailable.
  if(!env.ACCESS_SIGNALS)return
  await env.ACCESS_SIGNALS.put(progressSignalKey(id),JSON.stringify({revision:crypto.randomUUID()})).catch(()=>null)
}

async function publishAccessSignal(env:Env,id:string,levels:string[],updatedAt:string){
  if(!env.ACCESS_SIGNALS)return false
  try{await env.ACCESS_SIGNALS.put(accessSignalKey(id),JSON.stringify({levels,updatedAt}));return true}
  catch(error){console.error('Access KV signal failed; D1 grant remains saved',error);return false}
}
const CONTENT_SIGNAL_CACHE_KEY='https://meway.local/__content-signal-v1'
async function publishContentSignal(revisions:Revisions){
  try{
    const cache=await caches.open('meway-content-signal-v1')
    await cache.put(new Request(CONTENT_SIGNAL_CACHE_KEY),new Response(JSON.stringify({ok:true,appVersion:APP_CONTENT_VERSION,revisions}),{headers:{'Content-Type':'application/json; charset=UTF-8','Cache-Control':'public, max-age=31536000, immutable'}}))
  }catch{}
}
async function bumpRevision(env:Env,key:keyof Revisions,now=new Date().toISOString()){
  const rev=await getRevisions(env);const next={...rev,[key]:now};await env.DB.prepare('INSERT OR REPLACE INTO meway_meta (id,data,updated_at) VALUES (1,?,?)').bind(JSON.stringify(next),now).run();clearQueryCache('revisions');await publishContentSignal(next);return next
}
function resourceKey(section:string|undefined):keyof Revisions{return (section||'games') as keyof Revisions}

const builtInContent: ContentItem[] = [
  {id:201,section:'quizzes',title:'Quick Grammar A1',description:'Короткая проверка базовой грамматики.',status:'published',level:'A1',icon:'📝',xp:20,category:'Грамматика',payload:{questions:[{id:1,question:'She ___ English every day.',options:['study','studies','studying','studied'],correctAnswer:'studies',explanation:'С she в Present Simple добавляем -s/-es.'}]}},
  {id:301,section:'words',title:'Путешествия',description:'Главные слова для аэропорта, поездки и отеля.',status:'published',level:'A1',icon:'✈️',xp:0,category:'Путешествия',payload:{words:[{ru:'Самолёт',en:'Plane',transcription:'/pleɪn/',image:'',example:'The plane is ready.'},{ru:'Багаж',en:'Luggage',transcription:'/ˈlʌɡ.ɪdʒ/',image:'',example:'My luggage is heavy.'},{ru:'Билет',en:'Ticket',transcription:'/ˈtɪk.ɪt/',image:'',example:'Here is my ticket.'}]}},
  {id:401,section:'challenges',title:'7 дней английского',description:'Выполняй одно короткое задание каждый день.',status:'published',level:'A1',icon:'🔥',xp:100,category:'Серия',payload:{goal:'Не пропустить 7 дней подряд',instructions:'Каждый день открой MEWAY и заверши хотя бы одну миссию или квиз.',reward:'Значок «7 Day Streak» + 100 XP'}},
  {id:501,section:'rewards',title:'First Flight',description:'Твоя первая награда в MEWAY.',status:'published',level:'A1',icon:'🏆',xp:0,category:'Достижения',payload:{goal:'Заверши первую миссию',instructions:'Пройди любую опубликованную миссию до конца.',reward:'Значок First Flight'}},
]


// V7.19.8 reward normalization for the small hand-authored built-in starter set.
// The large generated curriculum is normalized in contentSeed.ts.
const v7198LevelWeight:Record<string,number>={A1:0,A2:1,B1:2,B2:3,C1:4,C2:5}
const v7198GameWeight:Record<string,number>={'word-match':0,'memory':0,'true-false':0,'image-guess':1,'odd-one':1,'word-builder':1,'missing-word':1,'sentence-order':2,'translation-input':2,'category-sort':2,'drag-sort':2,'speed':2,'grammar-race':3,'crossword':3,'picture-puzzle':3}
function v7198Reward(level:string,kind:'mission'|'game'|'quiz'|'challenge',steps:number,complexity=0){const li=v7198LevelWeight[level]??0;const base={mission:5,game:3,quiz:4,challenge:6}[kind];const per={mission:1.25,game:.9,quiz:1,challenge:1.3}[kind];return Math.max(kind==='game'?3:5,Math.min(150,Math.round((base+li*4+Math.max(1,steps)*per+complexity*(2+li))/5)*5))}
for(const m of seed){if(m.id<=3)m.xp=v7198Reward(m.level,'mission',m.tasks?.length||1,/grammar/i.test(`${m.category} ${m.title}`)?1:0)}
for(const x of builtInContent){
 if(x.section==='words'){x.xp=0;continue}
 if(x.section==='games')x.xp=v7198Reward(x.level,'game',Array.isArray(x.payload?.words)?x.payload.words.length:5,v7198GameWeight[x.payload?.gameType]??1)
 else if(x.section==='quizzes')x.xp=v7198Reward(x.level,'quiz',Array.isArray(x.payload?.questions)?x.payload.questions.length:5,1)
 else if(x.section==='challenges'){x.xp=v7198Reward(x.level,'challenge',Array.isArray(x.payload?.questions)?x.payload.questions.length:Number(x.payload?.target||7),2);if(x.payload?.reward)x.payload.reward=`+${x.xp} XP`}
}

let generatedContentCache: ContentItem[] | null = null
let generatedMissionsCache: Mission[] | null = null
async function loadGeneratedContent(env:Env):Promise<ContentItem[]> {
  if(generatedContentCache) return generatedContentCache
  const r=await env.ASSETS.fetch(new Request('https://meway.local/curriculum-content.json'))
  if(!r.ok) throw new Error(`curriculum-content.json ${r.status}`)
  generatedContentCache=await r.json<ContentItem[]>()
  return generatedContentCache
}
async function loadGeneratedMissions(env:Env):Promise<Mission[]> {
  if(generatedMissionsCache) return generatedMissionsCache
  const r=await env.ASSETS.fetch(new Request('https://meway.local/curriculum-missions.json'))
  if(!r.ok) throw new Error(`curriculum-missions.json ${r.status}`)
  generatedMissionsCache=await r.json<Mission[]>()
  return generatedMissionsCache
}

async function listContent(env: Env, section?: string, all = false) {
  await ensureDb(env)
  const key=`merged-content:${section||'all'}:${all?'all':'published'}`
  const hit=getQueryCache<ContentItem[]>(key); if(hit) return hit
  const [custom, deleted] = await Promise.all([
    section ? env.DB.prepare('SELECT data, updated_at FROM content WHERE section = ?').bind(section).all<{data:string;updated_at:string}>() : env.DB.prepare('SELECT data, updated_at FROM content').all<{data:string;updated_at:string}>(),
    env.DB.prepare('SELECT id FROM deleted_content').all<{id:number}>()
  ])
  const deletedIds=new Set((deleted.results||[]).map(x=>Number(x.id)))
  const merged=new Map<number,ContentItem>()
  const generated=await loadGeneratedContent(env)
  for(const x of builtInContent) if((!section||x.section===section)&&!deletedIds.has(x.id)) merged.set(x.id,x)
  for(const x of generated) if((!section||x.section===section)&&!deletedIds.has(x.id)) merged.set(x.id,x)
  for(const r of custom.results||[]){try{const x=JSON.parse(r.data) as ContentItem;/* V7.21.6: all games that existed before this reset are intentionally hidden. New admin-created games after the reset remain supported. */if(x.section==='games'&&String((r as any).updated_at||'')<'2026-10-06T04:00:00.000Z')continue;if(!deletedIds.has(x.id))merged.set(x.id,x)}catch{}}
  const items=[...merged.values()].sort((a,b)=>b.id-a.id)
  const result=all?items:items.filter(x=>x.status==='published')
  setQueryCache(key,result,10*60_000)
  return result
}

async function getDiscordUser(token: string): Promise<DiscordUser | null> {
  const hit=identityCache.get(token)
  if(hit&&hit.expires>Date.now()) return hit.user
  const r = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${token}` } })
  if(!r.ok) return null
  const user=(await r.json()) as DiscordUser
  identityCache.set(token,{expires:Date.now()+IDENTITY_TTL_MS,user})
  return user
}

async function requireUser(request: Request) {
  const auth = request.headers.get('Authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return null
  return getDiscordUser(token)
}

async function requireAdmin(request: Request, env: Env) {
  const auth = request.headers.get('Authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return null
  const user = await getDiscordUser(token)
  return user && user.id === env.ADMIN_DISCORD_ID ? user : null
}

async function listMissions(env: Env, all = false) {
  await ensureDb(env)
  const key=`merged-missions:${all?'all':'published'}`
  const hit=getQueryCache<Mission[]>(key); if(hit) return hit
  const [custom,deleted]=await Promise.all([
    env.DB.prepare('SELECT data FROM missions').all<{data:string}>(),
    env.DB.prepare('SELECT id FROM deleted_missions').all<{id:number}>()
  ])
  const deletedIds=new Set((deleted.results||[]).map(x=>Number(x.id)))
  const merged=new Map<number,Mission>()
  const generated=await loadGeneratedMissions(env)
  for(const m of seed) if(!deletedIds.has(m.id)) merged.set(m.id,m)
  for(const m of generated) if(!deletedIds.has(m.id)) merged.set(m.id,m)
  for(const r of custom.results||[]){try{const m=JSON.parse(r.data) as Mission;if(!deletedIds.has(m.id))merged.set(m.id,m)}catch{}}
  const items=[...merged.values()].sort((a,b)=>b.id-a.id)
  const result=all?items:items.filter(m=>m.status==='published')
  setQueryCache(key,result,10*60_000)
  return result
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/health') {
      return json({ ok: true, app: 'MEWAY', backend: 'Cloudflare Worker', config: {
        ready: Boolean(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET && env.ADMIN_DISCORD_ID && env.DB), version: APP_CONTENT_VERSION
      }})
    }

    if (url.pathname === '/api/admin/ui-config' && request.method === 'PUT') {
      const admin=await requireAdmin(request,env);if(!admin)return json({ok:false,error:'Admin required'},403);await ensureDb(env);const body=await request.json<any>().catch(()=>null);const raw=body?.config;if(!raw||typeof raw!=='object')return json({ok:false,error:'Invalid UI config'},400);const prev=await env.DB.prepare('SELECT data FROM ui_config WHERE id=1').first<{data:string}>();let old:any=DEFAULT_UI_CONFIG;try{if(prev?.data)old={...DEFAULT_UI_CONFIG,...JSON.parse(prev.data)}}catch{};const now=new Date().toISOString();const palette=raw.palette||{};const pages=(raw.pages&&typeof raw.pages==='object')?raw.pages:{};const safe:any={version:Math.max(1,Number(old.version)||1)+1,palette:{darkText:String(palette.darkText||DEFAULT_UI_CONFIG.palette.darkText).slice(0,20),darkMuted:String(palette.darkMuted||DEFAULT_UI_CONFIG.palette.darkMuted).slice(0,20),lightText:String(palette.lightText||DEFAULT_UI_CONFIG.palette.lightText).slice(0,20),lightMuted:String(palette.lightMuted||DEFAULT_UI_CONFIG.palette.lightMuted).slice(0,20),accent:String(palette.accent||DEFAULT_UI_CONFIG.palette.accent).slice(0,20),radius:Math.max(8,Math.min(36,Number(palette.radius)||22))},labels:{...DEFAULT_UI_CONFIG.labels,...(raw.labels||{})},pages,updatedAt:now};await env.DB.prepare('INSERT OR REPLACE INTO ui_config (id,data,updated_at) VALUES (1,?,?)').bind(JSON.stringify(safe),now).run();if(env.DISCORD_BOT_TOKEN){const changed=Object.keys(safe.palette).filter(k=>JSON.stringify(safe.palette[k])!==JSON.stringify(old.palette?.[k]));const content=`🧪 **MEWAY UI v${safe.version} опубликован**\nАдминистратор: ${admin.global_name||admin.username} (${admin.id})\nИзменено: ${changed.join(', ')||'тексты/настройки интерфейса'}\n${now}`;await fetch(`https://discord.com/api/v10/channels/${UI_AUDIT_CHANNEL_ID}/messages`,{method:'POST',headers:{Authorization:`Bot ${env.DISCORD_BOT_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({content})}).catch(()=>null)}return json({ok:true,config:safe})
    }

    if (url.pathname === '/api/auth/discord' && request.method === 'POST') {
      if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET || !env.ADMIN_DISCORD_ID) {
        return json({ ok: false, error: 'MEWAY server is not configured yet.' }, 500)
      }
      const body = await request.json<{ code?: string }>().catch(() => ({}))
      if (!body.code) return json({ ok: false, error: 'Discord authorization code is required.' }, 400)

      const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: env.DISCORD_CLIENT_ID, client_secret: env.DISCORD_CLIENT_SECRET, grant_type: 'authorization_code', code: body.code }),
      })
      if (!tokenResponse.ok) {
        console.error('Discord token exchange failed', tokenResponse.status, await tokenResponse.text())
        return json({ ok: false, error: 'Discord authorization failed. Close MEWAY and open the Activity again.' }, 401)
      }
      const token = await tokenResponse.json<{ access_token?: string }>()
      if (!token.access_token) return json({ ok: false, error: 'Discord did not return an access token.' }, 401)
      const user = await getDiscordUser(token.access_token)
      if (!user) return json({ ok: false, error: 'Could not load Discord user.' }, 401)
      const appRole=user.id === env.ADMIN_DISCORD_ID ? 'admin' : 'student'
      // STRICT CLOUD SAVER: the unavoidable Activity auth response also carries
      // access, revisions and the last saved progress. This avoids separate
      // /api/access, /api/manifest and /api/progress GETs on normal startup.
      await ensureDb(env)
      const [accessLevels,revisions,progressRow,placementRow]=await Promise.all([
        readCourseAccess(env,user.id,appRole==='admin'),
        getRevisions(env),
        env.DB.prepare('SELECT data FROM progress WHERE user_id = ?').bind(user.id).first<{data:string}>(),
        env.DB.prepare('SELECT data, updated_at FROM placement_results WHERE user_id = ?').bind(user.id).first<{data:string;updated_at:string}>()
      ])
      // Register every authenticated Discord visitor, including zero-XP students.
      // This is part of the existing OAuth bootstrap, not a navigation/polling request.
      if (!progressRow) {
        const now = new Date().toISOString()
        const initial = { discordUsername:user.username, discordGlobalName:user.global_name||'', nickname:user.global_name||user.username, xp:0, firstSeen:now, lastSeen:now, completedMissions:[], completedContent:[] }
        await env.DB.prepare('INSERT OR IGNORE INTO progress (user_id,data,updated_at) VALUES (?,?,?)').bind(user.id,JSON.stringify(initial),now).run()
        await publishProgressSignal(env,user.id)
        clearQueryCache('students')
      }
      let savedProgress:any=null, savedPlacement:any=null
      try{savedProgress=progressRow?.data?JSON.parse(progressRow.data):null}catch{}
      try{savedPlacement=placementRow?.data?JSON.parse(placementRow.data):null}catch{}
      // Assistant history/knowledge is loaded only when the Assistant page is opened.
      const uiRow=await env.DB.prepare('SELECT data FROM ui_config WHERE id=1').first<{data:string}>();let uiConfig:any=DEFAULT_UI_CONFIG;try{if(uiRow?.data)uiConfig={...DEFAULT_UI_CONFIG,...JSON.parse(uiRow.data)}}catch{}
      // Keep the Home route catalog intact; cachedPublic/list* avoid repeated full D1 scans on warm isolates.
      const [routeMissions,routeQuizzes,routeWords,routeChallenges]=await Promise.all([listMissions(env,false),listContent(env,'quizzes',false),listContent(env,'words',false),listContent(env,'challenges',false)])
      const learningCatalog={missions:routeMissions.map(x=>({id:x.id,level:x.level})),content:[...routeQuizzes,...routeWords,...routeChallenges].map(x=>({id:x.id,section:x.section,level:x.level}))}
      // SAFE CACHE RECOVERY: this same unavoidable auth response is the single
      // recovery bootstrap after browser/site storage is cleared. No extra D1
      // recovery endpoint/request is required.
      return json({ ok: true, accessToken: token.access_token, role: appRole, accessLevels, revisions, appVersion:APP_CONTENT_VERSION, progress:savedProgress, placementCompleted:!!placementRow, placementResult:savedPlacement, uiConfig, learningCatalog, courseRoleIds: COURSE_ACCESS_ROLES, user: {
        id: user.id, username: user.username, globalName: user.global_name ?? null, avatar: user.avatar ?? null
      }})
    }




    if (url.pathname === '/api/assistant/bootstrap' && request.method === 'GET') {
      const user=await requireUser(request);if(!user)return json({ok:false,error:'Discord authentication required.'},401)
      await ensureDb(env)
      const admin=user.id===env.ADMIN_DISCORD_ID
      const knowledgeRows=await env.DB.prepare('SELECT id,data,updated_at FROM assistant_knowledge ORDER BY id DESC LIMIT 500').all<{id:number;data:string;updated_at:string}>()
      const assistantKnowledge=(knowledgeRows.results||[]).flatMap(r=>{try{return [{...JSON.parse(r.data),cloudId:r.id,updatedAt:r.updated_at}]}catch{return []}})
      let assistantInbox:any[]=[]
      if(admin){
        const threads=await env.DB.prepare('SELECT user_id,user_name,last_question,status,updated_at FROM assistant_threads ORDER BY updated_at DESC LIMIT 200').all<any>()
        const messages=await env.DB.prepare('SELECT id,user_id,sender,kind,text,created_at FROM assistant_messages ORDER BY id DESC LIMIT 1200').all<any>()
        const byUser=new Map<string,any[]>();for(const m of messages.results||[]){const a=byUser.get(m.user_id)||[];a.push(m);byUser.set(m.user_id,a)}
        assistantInbox=(threads.results||[]).map(t=>({...t,messages:(byUser.get(t.user_id)||[]).reverse()}))
      }else{
        const replies=await env.DB.prepare("SELECT id,sender,kind,text,created_at FROM assistant_messages WHERE user_id=? AND sender='admin' ORDER BY id ASC LIMIT 200").bind(user.id).all<any>()
        assistantInbox=replies.results||[]
      }
      return json({ok:true,assistantKnowledge,assistantInbox})
    }

    // MEWAY Assistant: automatic known answers stay local. Only an unknown student
    // question is escalated (one HTTP request), and each manual admin reply is one
    // HTTP request. There is deliberately no polling endpoint used by the UI.
    if (url.pathname === '/api/assistant/escalate' && request.method === 'POST') {
      const user=await requireUser(request);if(!user)return json({ok:false,error:'Discord authentication required.'},401)
      await ensureDb(env);const body=await request.json<any>().catch(()=>null);const question=String(body?.question||'').trim().slice(0,1200)
      if(!question)return json({ok:false,error:'Question required.'},400)
      const now=new Date().toISOString(),userName=String(user.global_name||user.username||'Ученик').slice(0,80)
      // Cross-user duplicate guard: identical unknown questions within 24h are still recorded,
      // but Discord receives only the first alert. This avoids notification storms.
      const duplicate=await env.DB.prepare("SELECT COUNT(*) AS n FROM assistant_messages WHERE sender='student' AND kind='unknown' AND lower(trim(text))=lower(trim(?)) AND datetime(created_at)>=datetime('now','-1 day')").bind(question).first<{n:number}>()
      await env.DB.batch([
        env.DB.prepare("INSERT INTO assistant_messages (user_id,sender,kind,text,created_at) VALUES (?,'student','unknown',?,?)").bind(user.id,question,now),
        env.DB.prepare("INSERT INTO assistant_threads (user_id,user_name,last_question,status,updated_at) VALUES (?,?,?,'open',?) ON CONFLICT(user_id) DO UPDATE SET user_name=excluded.user_name,last_question=excluded.last_question,status='open',updated_at=excluded.updated_at").bind(user.id,userName,question,now)
      ])
      // Same escalation request also sends one Discord notification. This does NOT create
      // another Cloudflare invocation; it is one outbound Discord REST call inside this request.
      // The D1 queue remains the source of truth even if Discord is temporarily unavailable.
      const discordAlert=Number(duplicate?.n||0)>0?{ok:true,deduplicated:true}:await notifyAssistantUnknown(env,user,question)
      return json({ok:true,queued:true,discordAlert:discordAlert.ok,deduplicated:Number(duplicate?.n||0)>0})
    }

    if (url.pathname === '/api/assistant/support' && request.method === 'POST') {
      const user=await requireUser(request);if(!user)return json({ok:false,error:'Discord authentication required.'},401)
      await ensureDb(env);const body=await request.json<any>().catch(()=>null);const message=String(body?.message||'').trim().slice(0,1800)
      if(!message)return json({ok:false,error:'Message required.'},400)
      const now=new Date().toISOString(),userName=String(user.global_name||user.username||'Ученик').slice(0,80)
      await env.DB.batch([
        env.DB.prepare("INSERT INTO assistant_messages (user_id,sender,kind,text,created_at) VALUES (?,'student','support',?,?)").bind(user.id,message,now),
        env.DB.prepare("INSERT INTO assistant_threads (user_id,user_name,last_question,status,updated_at) VALUES (?,?,?,'open',?) ON CONFLICT(user_id) DO UPDATE SET user_name=excluded.user_name,last_question=excluded.last_question,status='open',updated_at=excluded.updated_at").bind(user.id,userName,message,now)
      ])
      const discordAlert=await notifyAssistantSupport(env,user,message)
      return json({ok:true,message:{user_id:user.id,sender:'student',kind:'support',text:message,created_at:now},discordAlert:discordAlert.ok})
    }

    if (url.pathname === '/api/admin/assistant/reply' && request.method === 'POST') {
      const admin=await requireAdmin(request,env);if(!admin)return json({ok:false,error:'Admin access required.'},403)
      await ensureDb(env);const body=await request.json<any>().catch(()=>null),userId=String(body?.userId||'').trim(),text=String(body?.text||'').trim().slice(0,2400)
      if(!/^\d+$/.test(userId)||!text)return json({ok:false,error:'Invalid reply.'},400)
      const now=new Date().toISOString();await env.DB.batch([
        env.DB.prepare("INSERT INTO assistant_messages (user_id,sender,kind,text,created_at) VALUES (?,'admin','manual',?,?)").bind(userId,text,now),
        env.DB.prepare("UPDATE assistant_threads SET status='answered',updated_at=? WHERE user_id=?").bind(now,userId)
      ])
      return json({ok:true,message:{user_id:userId,sender:'admin',kind:'manual',text,created_at:now}})
    }

    if (url.pathname === '/api/admin/assistant/knowledge' && request.method === 'POST') {
      const admin=await requireAdmin(request,env);if(!admin)return json({ok:false,error:'Admin access required.'},403)
      await ensureDb(env);const body=await request.json<any>().catch(()=>null);const title=String(body?.title||'').trim().slice(0,180),answer=String(body?.answer||'').trim().slice(0,3000),keywords=Array.isArray(body?.keywords)?body.keywords.map((x:any)=>String(x).trim().slice(0,120)).filter(Boolean).slice(0,80):[]
      if(!title||!answer||!keywords.length)return json({ok:false,error:'Title, answer and keywords required.'},400)
      const now=new Date().toISOString(),data={id:`cloud-${Date.now()}`,title,answer,keywords,followups:Array.isArray(body?.followups)?body.followups.slice(0,8):[]};const r=await env.DB.prepare('INSERT INTO assistant_knowledge (data,updated_at) VALUES (?,?)').bind(JSON.stringify(data),now).run()
      return json({ok:true,entry:{...data,cloudId:r.meta?.last_row_id,updatedAt:now}})
    }

    // Atomic, idempotent XP claims. The client never supplies the XP award.
    if (url.pathname === '/api/xp/claim' && request.method === 'POST') {
      const user=await requireUser(request);if(!user)return json({ok:false,error:'Discord authentication required.'},401)
      const body=await request.json<any>().catch(()=>null)
      const operationId=String(body?.operationId||'')
      const kind=String(body?.kind||'')
      const itemId=String(body?.itemId||'')
      if(!/^[a-zA-Z0-9_-]{12,100}$/.test(operationId)||!['mission','content','daily'].includes(kind)||!((kind==='daily'&&/^\d{4}-\d{2}-\d{2}$/.test(itemId))||(/^[0-9]{1,12}$/.test(itemId)&&kind!=='daily')))return json({ok:false,error:'Invalid XP claim.'},400)
      await ensureDb(env)
      if(kind==='daily'){
        const now=new Date().toISOString(),today=now.slice(0,10)
        if(itemId!==today)return json({ok:false,error:'Daily reward must use current UTC date.'},422)
        const settings=await getSettings(env)
        if(!settings.daily.enabled)return json({ok:false,error:'Daily reward is disabled.'},403)
        // Only server-confirmed completed activities count; client-side answer counters are untrusted.
        const metric=settings.daily.metric
        const kinds=metric==='missions'?['mission']:metric==='materials'?['content']:['mission','content']
        const placeholders=kinds.map(()=>'?').join(',')
        const countRow=await env.DB.prepare(`SELECT COUNT(*) AS n FROM xp_operations WHERE user_id=? AND kind IN (${placeholders}) AND substr(created_at,1,10)=?`).bind(user.id,...kinds,today).first<{n:number}>()
        if(Number(countRow?.n||0)<Math.max(1,Number(settings.daily.target)||1))return json({ok:false,error:'Daily goal is not yet confirmed by the server.'},422)
        const award=Math.max(0,Math.min(1000,Number(settings.daily.rewardXp)||0))
        const results=await env.DB.batch([
          env.DB.prepare("INSERT OR IGNORE INTO progress (user_id,data,updated_at) VALUES (?,json_object('xp',0),?)").bind(user.id,now),
          env.DB.prepare('INSERT OR IGNORE INTO xp_operations (user_id,operation_id,kind,item_id,xp,created_at) VALUES (?,?,?,?,?,?)').bind(user.id,operationId,'daily',today,award,now),
          env.DB.prepare("UPDATE progress SET data=json_set(data,'$.xp',COALESCE(CAST(json_extract(data,'$.xp') AS INTEGER),0)+?,'$.dailyClaimDate',?),updated_at=? WHERE user_id=? AND EXISTS (SELECT 1 FROM xp_operations WHERE user_id=? AND operation_id=? AND kind='daily' AND item_id=? AND created_at=?)").bind(award,today,now,user.id,user.id,operationId,today,now),
          env.DB.prepare('SELECT data FROM progress WHERE user_id=?').bind(user.id)
        ])
        const progress=JSON.parse(String((results[3].results?.[0] as any)?.data||'{}'))
        if(results[2].meta?.changes){await publishProgressSignal(env,user.id);await env.DB.prepare('INSERT OR IGNORE INTO xp_role_outbox(user_id,updated_at) VALUES (?,?)').bind(user.id,now).run()}
        return json({ok:true,progress,alreadyCompleted:!(results[2].meta?.changes||0)})
      }
      const item=kind==='mission'?(await listMissions(env,true)).find((x:any)=>String(x.id)===itemId):(await Promise.all(['games','quizzes','words','challenges','rewards','grammar','vocabulary','listening','speaking','writing','reading','video'].map(section=>listContent(env,section,true)))).flat().find((x:any)=>String(x.id)===itemId)
      if(!item)return json({ok:false,error:'Unknown learning item.'},404)
      if(item.status!=='published')return json({ok:false,error:'Learning item is not published.'},403)
      const allowed=await readCourseAccess(env,user.id,user.id===env.ADMIN_DISCORD_ID)
      if(item.level&&!allowed.includes(item.level))return json({ok:false,error:'Course level is not available.'},403)
      // An item identifier is never sufficient evidence of completion.
      // Validate the submitted answer transcript against the authoritative item
      // stored on the server. Other interactive formats need their own verifier.
      const tasks=kind==='mission'?item.tasks:(item.section==='quizzes'||item.section==='challenges'?item.payload?.questions:null)
      const submitted=body?.answers
      const graded=Array.isArray(tasks)&&tasks.length>0
      if(graded&&(tasks.length>100||!Array.isArray(submitted)||submitted.length!==tasks.length)){
        return json({ok:false,error:'Verified answer transcript required for XP.'},422)
      }
      // Non-graded activities have no server-side answer key. Preserve their
      // existing completion rewards, but never describe these as cheat-proof.
      if(!graded&&(kind!=='content'||body?.completed!==true))return json({ok:false,error:'Explicit activity completion required.'},422)
      const normalizeAnswer=(value:unknown)=>String(value??'').trim().toLocaleLowerCase('en-GB').replace(/[’‘]/g,"'").replace(/\s+/g,' ')
      const validTranscript=!graded||tasks.every((task:any,index:number)=>{
        const answer=submitted[index]
        if(typeof answer!=='string'||answer.length>1000)return false
        // Wrong answers are permitted in a completed attempt, but every
        // answer must be an offered option or an actual text entry.
        return (Array.isArray(task.options)&&task.options.length>0)
          ?task.options.some((option:unknown)=>normalizeAnswer(option)===normalizeAnswer(answer))
          :Boolean(normalizeAnswer(answer))
      })
      if(!validTranscript)return json({ok:false,error:'Invalid or incomplete answer transcript.'},422)
      const correctCount=graded?tasks.filter((task:any,index:number)=>{
        const accepted=[task.correctAnswer,...(Array.isArray(task.acceptedAnswers)&&(!Array.isArray(task.options)||!task.options.length)?task.acceptedAnswers:[])].map(normalizeAnswer)
        return accepted.includes(normalizeAnswer(submitted[index]))
      }).length:0
      const award=Math.max(0,Math.min(1000,Number(item.xp)||0))
      const now=new Date().toISOString()
      // D1 batch executes the conditional claim and progress update as one transaction.
      // A duplicate operation or already-completed item cannot award XP again.
      // Transactional claim: the item is only rewarded if it is not already in
      // the legacy completion array. Preserve pre-existing XP and completions.
      const path=kind==='mission'?'$.completedMissions':'$.completedContent'
      const results=await env.DB.batch([
        env.DB.prepare("INSERT OR IGNORE INTO progress (user_id,data,updated_at) VALUES (?,json_object('xp',0,'completedMissions',json('[]'),'completedContent',json('[]')),?)").bind(user.id,now),
        env.DB.prepare(`INSERT OR IGNORE INTO xp_operations (user_id,operation_id,kind,item_id,xp,created_at)
          SELECT ?,?,?,?,?,? WHERE NOT EXISTS (
            SELECT 1 FROM json_each(COALESCE((SELECT json_extract(data,?) FROM progress WHERE user_id=?),json('[]')))
            WHERE CAST(value AS TEXT)=?
          )`).bind(user.id,operationId,kind,itemId,award,now,path,user.id,itemId),
        env.DB.prepare(`UPDATE progress SET
          data=json_set(data, ?, json_insert(COALESCE(json_extract(data,?),json('[]')),'$[#]',CAST(? AS INTEGER)),
            '$.xp',COALESCE(CAST(json_extract(data,'$.xp') AS INTEGER),0)+?),updated_at=?
          WHERE user_id=? AND EXISTS (
            SELECT 1 FROM xp_operations WHERE user_id=? AND operation_id=? AND kind=? AND item_id=? AND created_at=?
          ) AND NOT EXISTS (
            SELECT 1 FROM json_each(COALESCE(json_extract(data,?),json('[]'))) WHERE CAST(value AS TEXT)=?
          )`).bind(path,path,itemId,award,now,user.id,user.id,operationId,kind,itemId,now,path,itemId),
        env.DB.prepare('SELECT data FROM progress WHERE user_id=?').bind(user.id)
      ])
      const row=results[3].results?.[0] as {data?:string}|undefined
      const progress=row?.data?JSON.parse(row.data):null
      if(results[2].meta?.changes){await publishProgressSignal(env,user.id);await env.DB.prepare('INSERT OR IGNORE INTO xp_role_outbox(user_id,updated_at) VALUES (?,?)').bind(user.id,now).run()}
      if(results[2].meta?.changes){
        try{const role=await syncDiscordLevelRole(env,user.id,Number(progress?.xp)||0);if(role.ok)await env.DB.prepare('DELETE FROM xp_role_outbox WHERE user_id=?').bind(user.id).run();else await env.DB.prepare('UPDATE xp_role_outbox SET attempts=attempts+1,last_error=? WHERE user_id=?').bind(String(role.error||'Discord unavailable').slice(0,300),user.id).run()}catch(e){await env.DB.prepare('UPDATE xp_role_outbox SET attempts=attempts+1,last_error=? WHERE user_id=?').bind(String(e).slice(0,300),user.id).run().catch(()=>null)}
      }
      clearQueryCache('students');clearQueryCache('leaderboard')
      return json({ok:true,progress,verifiedScore:graded?{correct:correctCount,total:tasks.length}:null,alreadyCompleted:!(results[2].meta?.changes||0)})
    }

    if (url.pathname === '/api/progress') {
      const user = await requireUser(request)
      if (!user) return json({ ok: false, error: 'Discord authentication required.' }, 401)
      await ensureDb(env)
      if (request.method === 'GET') {
        const row = await env.DB.prepare('SELECT data, updated_at FROM progress WHERE user_id = ?').bind(user.id).first<{data:string;updated_at:string}>()
        const now=new Date().toISOString()
        const base:any = { xp: 0, completedMissions: [], completedContent: [], nickname: '', avatar: '', mistakes: 0, correctAnswers:0, answerCount:0, activityDays:[], sectionStats:{}, leaderboardVisible:true, firstSeen: now, lastSeen: now, discordUsername: user.username, discordGlobalName: user.global_name ?? '' }
        const previous:any=row?.data?JSON.parse(row.data):{};const progress:any = row?.data ? { ...base, ...previous, lastSeen: now, discordUsername:user.username, discordGlobalName:user.global_name??'' } : base; const today=now.slice(0,10);const hadToday=Array.isArray(previous.activityDays)&&previous.activityDays.includes(today);progress.activityDays=Array.from(new Set([...(progress.activityDays||[]),today])).slice(-5000)
        // ZERO-POLLING: opening/refreshing the app never calls Discord just to re-check a role.
        // D1 is written on GET only when persistent data actually changes (first visit, first activity of a new day, or Discord identity change).
        const identityChanged=previous.discordUsername!==user.username||previous.discordGlobalName!==(user.global_name??'');const shouldWrite=!row||!hadToday||identityChanged
        if(shouldWrite){if(!row)await env.DB.prepare('INSERT OR IGNORE INTO progress (user_id,data,updated_at) VALUES (?,?,?)').bind(user.id,JSON.stringify(progress),now).run();else await env.DB.prepare("UPDATE progress SET data=json_patch(data,?),updated_at=? WHERE user_id=?").bind(JSON.stringify({lastSeen:now,discordUsername:user.username,discordGlobalName:user.global_name??'',activityDays:progress.activityDays}),now,user.id).run()}
        return json({ ok: true, progress })
      }
      if (request.method === 'PUT') {
        const data = await request.json<any>().catch(()=>null)
        if (!data || typeof data !== 'object') return json({ok:false,error:'Invalid progress.'},400)
        const oldRow=await env.DB.prepare('SELECT data FROM progress WHERE user_id = ?').bind(user.id).first<{data:string}>()
        const old:any=oldRow?.data?JSON.parse(oldRow.data):{}
        const now=new Date().toISOString()
        const safe:any = { xp: Math.max(0, Number(old.xp)||0), completedMissions: Array.isArray(old.completedMissions)?old.completedMissions:[], completedContent: Array.isArray(old.completedContent)?old.completedContent:[], nickname: String(data.nickname||'').slice(0,40), avatar: String(data.avatar||'').slice(0,750000), mistakes: Math.max(0,Number(data.mistakes??old.mistakes)||0), correctAnswers:Math.max(0,Number(data.correctAnswers??old.correctAnswers)||0), answerCount:Math.max(0,Number(data.answerCount??old.answerCount)||0), activityDays:Array.isArray(data.activityDays)?data.activityDays.slice(-5000):Array.isArray(old.activityDays)?old.activityDays.slice(-5000):[], sectionStats:(data.sectionStats&&typeof data.sectionStats==='object')?data.sectionStats:(old.sectionStats||{}), dailyAnswers:Math.max(0,Number(data.dailyAnswers??old.dailyAnswers)||0),dailyMissionCount:Math.max(0,Number(data.dailyMissionCount??old.dailyMissionCount)||0),dailyContentCount:Math.max(0,Number(data.dailyContentCount??old.dailyContentCount)||0),dailyAnswerDate:String(data.dailyAnswerDate ?? old.dailyAnswerDate ?? '').slice(0,10),dailyClaimDate:String(data.dailyClaimDate ?? old.dailyClaimDate ?? '').slice(0,10),leaderboardVisible:data.leaderboardVisible!==false, xpEvents:Array.isArray(old.xpEvents)?old.xpEvents.slice(-120):[], events:Array.isArray(old.events)?old.events.slice(-80):[], firstSeen: old.firstSeen||now, lastSeen: now, discordUsername:user.username, discordGlobalName:user.global_name??'' }
        const oldXp=Math.max(0,Number(old.xp)||0);if(safe.xp>oldXp){safe.xpEvents=[...(safe.xpEvents||[]),{date:now,delta:safe.xp-oldXp}].slice(-120)}
        const addEvent=(type:string,text:string)=>{safe.events=[...(safe.events||[]),{date:now,type,text}].slice(-80)}
        const oldLevel=levelForXp(oldXp),newLevel=levelForXp(safe.xp);if(newLevel?.id&&newLevel.id!==oldLevel?.id)addEvent('level',`достиг(ла) уровня ${newLevel.name}`)
        const oldM=new Set<number>(Array.isArray(old.completedMissions)?old.completedMissions:[]),oldC=new Set<number>(Array.isArray(old.completedContent)?old.completedContent:[]);if(safe.completedMissions.some((id:number)=>!oldM.has(id)))addEvent('mission','завершил(а) новую миссию');if(safe.completedContent.some((id:number)=>!oldC.has(id)))addEvent('content','завершил(а) новый материал')
        const oldStreak=streakForDays(old.activityDays),newStreak=streakForDays(safe.activityDays),cfg=await getSettings(env);for(const milestone of cfg.streak.milestones){if(oldStreak<milestone&&newStreak>=milestone)addEvent('streak',`достиг(ла) серии ${milestone} дней 🔥`)}
        const desired=levelForXp(safe.xp)?.id||''
        // CLOUD-SAVER role sync: no timer, polling, refresh-time Discord checks, or checks on ordinary saves.
        // Discord is contacted immediately on an XP-level crossing. If a previous Discord sync failed,
        // retry only on a later progress save and at most once every 5 minutes until D1 confirms the desired role.
        // This keeps normal Cloudflare/Discord traffic minimal while making failed role grants self-healing.
        const levelChanged=newLevel?.id!==oldLevel?.id
        const roleCacheMissing=typeof old.syncedRoleId!=='string'
        const roleCacheMismatch=(typeof old.syncedRoleId==='string'&&old.syncedRoleId!==desired)
        const lastRoleErrorAt=Date.parse(String(old.roleSyncError?.at||''))
        const retryDue=roleCacheMismatch&&(!Number.isFinite(lastRoleErrorAt)||(Date.now()-lastRoleErrorAt)>=5*60*1000)
        const mustVerifyRole=levelChanged||roleCacheMissing||retryDue
        let roleSync:any=null
        if(mustVerifyRole){
          roleSync=await syncDiscordLevelRole(env,user.id,safe.xp)
          if(roleSync.ok){safe.syncedRoleId=desired;safe.roleVerifiedAt=now;delete safe.roleSyncError}
          else{safe.syncedRoleId=old.syncedRoleId||'';safe.roleVerifiedAt=old.roleVerifiedAt||'';safe.roleSyncError=roleSync.configured?{status:roleSync.status||0,error:roleSync.error||'Discord role sync failed',at:now}: {status:0,error:'Discord role sync is not configured',at:now}}
        }else{safe.syncedRoleId=old.syncedRoleId||'';safe.roleVerifiedAt=old.roleVerifiedAt||''}
        // Merge only non-authoritative profile fields into the current D1 record.
        // Never overwrite server XP or completed items using a stale client snapshot.
        const {xp:_ignoredXp,completedMissions:_ignoredMissions,completedContent:_ignoredContent,...profilePatch}=safe
        await env.DB.prepare("INSERT OR IGNORE INTO progress (user_id,data,updated_at) VALUES (?,?,?)").bind(user.id,JSON.stringify({xp:0,completedMissions:[],completedContent:[]}),now).run()
        await env.DB.prepare("UPDATE progress SET data=json_patch(data,?),updated_at=? WHERE user_id=?").bind(JSON.stringify(profilePatch),now,user.id).run()
        const latest=await env.DB.prepare('SELECT data FROM progress WHERE user_id=?').bind(user.id).first<{data:string}>()
        const confirmed=latest?.data?JSON.parse(latest.data):safe
        await publishProgressSignal(env,user.id)
        clearQueryCache('leaderboard')
        clearQueryCache('students')
        return json({ok:true,progress:confirmed,roleSync:roleSync?{ok:roleSync.ok,configured:roleSync.configured,role:roleSync.role||null,roleId:roleSync.roleId||null,status:roleSync.status||null,error:roleSync.error||null}:null})
      }
    }

    if (url.pathname === '/api/placement-config' && request.method === 'GET') {
      const user=await requireUser(request);if(!user)return json({ok:false,error:'Discord authentication required.'},401)
      await ensureDb(env)
      // CLOUD-SAVER: variant selection needs only the last counted result, not the full audit history.
      // Full placement_history remains intact and is read only from the admin Students audit screen.
      const [cfgRow,lastRow]=await Promise.all([
        (async()=>{const hit=cachedPublic('placement-config') as {data?:string}|null;if(hit)return hit;const row=await env.DB.prepare('SELECT data FROM placement_config WHERE id=1').first<{data:string}>();setPublic('placement-config',row||{});return row})(),
        env.DB.prepare('SELECT data,updated_at FROM placement_results WHERE user_id=?').bind(user.id).first<{data:string;updated_at:string}>()
      ])
      let variants:any=placementVariants;try{const parsed=cfgRow?.data?JSON.parse(cfgRow.data):null;if(parsed?.variants)variants=parsed.variants;else if(Array.isArray(parsed?.questions))variants={...placementVariants,1:parsed.questions}}catch{}
      let last:any=null;try{last=lastRow?.data?{...JSON.parse(lastRow.data),createdAt:lastRow.updated_at}:null}catch{}
      const now=Date.now(),gap=PLACEMENT_RETAKE_DAYS*86400000
      let variant=1,eligible=true,attempt=1
      if(last){const previousAttempt=Math.max(1,Number(last.attempt)||1),elapsed=now-Date.parse(last.completedAt||last.createdAt||'');eligible=elapsed>=gap;if(!eligible){variant=Math.max(1,Math.min(5,Number(last.variant)||1));attempt=previousAttempt}else if(previousAttempt<5){variant=previousAttempt+1;attempt=previousAttempt+1}else{attempt=previousAttempt+1;const lastV=Number(last.variant)||5;const pool=[1,2,3,4,5].filter(v=>v!==lastV);let h=0;for(const c of user.id)h=(h*31+c.charCodeAt(0))>>>0;variant=pool[(h+Math.floor(now/gap))%pool.length]}}
      const questions=(variants[String(variant)]||variants[variant]||placementVariants[variant]||placementVariants[1])
      return json({ok:true,questions,variant,attempt,eligible,retakeDays:PLACEMENT_RETAKE_DAYS,lastCompletedAt:last?.completedAt||last?.createdAt||null})
    }

    if (url.pathname === '/api/placement' && request.method === 'POST') {
      const user=await requireUser(request);if(!user)return json({ok:false,error:'Discord authentication required.'},401)
      await ensureDb(env);const body=await request.json<any>().catch(()=>null);if(!body||!body.level)return json({ok:false,error:'Invalid placement result.'},400)
      const lastRow=await env.DB.prepare('SELECT data,updated_at FROM placement_results WHERE user_id=?').bind(user.id).first<{data:string;updated_at:string}>()
      let last:any=null;try{last=lastRow?.data?{...JSON.parse(lastRow.data),createdAt:lastRow.updated_at}:null}catch{}
      const now=new Date().toISOString(),gap=PLACEMENT_RETAKE_DAYS*86400000,previousAttempt=Math.max(0,Number(last?.attempt)||0)
      const eligible=!last||(Date.now()-Date.parse(last.completedAt||last.createdAt||''))>=gap;const variant=Math.max(1,Math.min(5,Number(body.variant)||1));const attempt=previousAttempt+(eligible?1:0)
      const record={...body,variant,attempt,counted:eligible,completedAt:now,daysSincePrevious:last?Math.floor((Date.now()-Date.parse(last.completedAt||last.createdAt||''))/86400000):null,previousLevel:last?.level||null}
      const statements=[env.DB.prepare('INSERT INTO placement_history (user_id,data,created_at) VALUES (?,?,?)').bind(user.id,JSON.stringify(record),now)]
      if(eligible)statements.push(env.DB.prepare('INSERT OR REPLACE INTO placement_results (user_id,data,updated_at) VALUES (?,?,?)').bind(user.id,JSON.stringify(record),now))
      await env.DB.batch(statements)
      clearQueryCache('students');return json({ok:true,counted:eligible,attempt,variant,result:record})
    }

    if (url.pathname === '/api/admin/placement-config') {
      const admin=await requireAdmin(request,env);if(!admin)return json({ok:false,error:'Admin access required.'},403);await ensureDb(env)
      if(request.method==='GET'){const row=await env.DB.prepare('SELECT data FROM placement_config WHERE id=1').first<{data:string}>();let config:any={variants:placementVariants};try{if(row?.data)config={...config,...JSON.parse(row.data)}}catch{};return json({ok:true,...config})}
      if(request.method==='PUT'){const body=await request.json<any>().catch(()=>null);if(!body)return json({ok:false,error:'Invalid config.'},400);const variants=body.variants||{1:body.questions};for(let v=1;v<=5;v++){const qs=variants[v]||variants[String(v)];if(!Array.isArray(qs)||qs.length!==48)return json({ok:false,error:`Variant ${v} must contain exactly 48 questions.`},400)}const now=new Date().toISOString();await env.DB.prepare('INSERT OR REPLACE INTO placement_config (id,data,updated_at) VALUES (1,?,?)').bind(JSON.stringify({variants}),now).run();clearPublic();return json({ok:true,variants})}
    }

    if (url.pathname === '/api/settings' && request.method === 'GET') {
      const user=await requireUser(request);if(!user)return json({ok:false,error:'Discord authentication required.'},401)
      return json({ok:true,settings:await getSettings(env)})
    }

    if (url.pathname === '/api/access-signal' && request.method === 'GET') {
      const user=await requireUser(request);if(!user)return json({ok:false,error:'Discord authentication required.'},401)
      if(!env.ACCESS_SIGNALS)return json({ok:true,changed:false,levels:null,signalAvailable:false})
      // One KV read, zero D1 reads. Missing signal means no changes since bootstrap.
      const value=await env.ACCESS_SIGNALS.get(accessSignalKey(user.id),'json') as {levels?:string[];updatedAt?:string}|null
      return json({ok:true,changed:!!value,levels:value?.levels,updatedAt:value?.updatedAt||''})
    }
    if (url.pathname === '/api/progress-signal' && request.method === 'GET') {
      const user=await requireUser(request);if(!user)return json({ok:false,error:'Discord authentication required.'},401)
      if(!env.ACCESS_SIGNALS){const levels=await readCourseAccess(env,user.id);return json({ok:true,revision:null,needsRecovery:false,levels,signalAvailable:false})}
      let signal:{revision?:string}|null=null;let access:{levels?:string[]}|null=null;try{[signal,access]=await Promise.all([env.ACCESS_SIGNALS.get(progressSignalKey(user.id),'json') as Promise<{revision?:string}|null>,env.ACCESS_SIGNALS.get(accessSignalKey(user.id),'json') as Promise<{levels?:string[]}|null>])}catch{const levels=await readCourseAccess(env,user.id);return json({ok:true,revision:null,needsRecovery:false,levels,signalAvailable:false})}
      // Missing signal is NOT evidence that a cached profile is fresh.
      return json({ok:true,revision:signal?.revision||null,needsRecovery:!signal,levels:access?.levels||await readCourseAccess(env,user.id),signalAvailable:true})
    }
    if ((url.pathname === '/api/content-signal' || url.pathname === '/api/manifest') && request.method === 'GET') {
      // One small authoritative revision read on Activity entry. Never serve a stale
      // edge/browser signal after an administrator publishes or edits content.
      const revisions=await getRevisions(env)
      return new Response(JSON.stringify({ok:true,appVersion:APP_CONTENT_VERSION,revisions}),{
        headers:{'Content-Type':'application/json; charset=UTF-8','Cache-Control':'no-store, max-age=0','Vary':'Authorization'}
      })
    }

    if (url.pathname === '/api/sync' && request.method === 'GET') {
      const user=await requireUser(request);if(!user)return json({ok:false,error:'Discord authentication required.'},401)
      const resource=url.searchParams.get('resource')||'';const since=url.searchParams.get('since')||'';await ensureDb(env)
      if(resource==='missions'){const [changed,deleted]=await Promise.all([env.DB.prepare('SELECT data,updated_at FROM missions WHERE updated_at > ?').bind(since).all<{data:string;updated_at:string}>(),env.DB.prepare('SELECT id,deleted_at FROM deleted_missions WHERE deleted_at > ?').bind(since).all<{id:number;deleted_at:string}>()]);return json({ok:true,resource,changed:(changed.results||[]).map(x=>{try{return resource==='missions'?studentMission(JSON.parse(x.data)):studentContent(JSON.parse(x.data))}catch{return null}}).filter(Boolean),deleted:(deleted.results||[]).map(x=>x.id),revision:(await getRevisions(env)).missions})}
      if(['games','quizzes','words','challenges','rewards'].includes(resource)){const [changed,deleted]=await Promise.all([env.DB.prepare('SELECT data,updated_at FROM content WHERE section = ? AND updated_at > ?').bind(resource,since).all<{data:string;updated_at:string}>(),env.DB.prepare('SELECT id,deleted_at FROM deleted_content WHERE deleted_at > ?').bind(since).all<{id:number;deleted_at:string}>()]);return json({ok:true,resource,changed:(changed.results||[]).map(x=>{try{return resource==='missions'?studentMission(JSON.parse(x.data)):studentContent(JSON.parse(x.data))}catch{return null}}).filter(Boolean),deleted:(deleted.results||[]).map(x=>x.id),revision:(await getRevisions(env))[resource as keyof Revisions]})}
      return json({ok:false,error:'Unknown sync resource.'},400)
    }

    if (url.pathname === '/api/content' && request.method === 'GET') {
      const user=await requireUser(request);if(!user)return json({ok:false,error:'Discord authentication required.'},401)
      const section=url.searchParams.get('section') || undefined
      const key=`content:${section||'all'}`
      const hit=cachedPublic(key)
      if(hit) return json({ok:true,items:hit})
      const items=await listContent(env,section)
      const safeItems=items.map(studentContent)
      setPublic(key,safeItems)
      return json({ok:true,items:safeItems})
    }


    if (url.pathname === '/api/leaderboard' && request.method === 'GET') {
      const user=await requireUser(request);if(!user)return json({ok:false,error:'Discord authentication required.'},401)
      const cached=getQueryCache<any[]>('leaderboard')
      if(cached)return json({ok:true,leaders:cached})
      await ensureDb(env)
      const rows=await env.DB.prepare('SELECT user_id, data FROM progress').all<{user_id:string;data:string}>()
      const now=Date.now(),d7=now-7*86400000,d30=now-30*86400000;const leaders=(rows.results||[]).map(r=>{const d:any=JSON.parse(r.data||'{}');const ev=Array.isArray(d.xpEvents)?d.xpEvents:[];return {name:d.nickname||d.discordGlobalName||d.discordUsername||'Ученик MEWAY',avatar:String(d.avatar||'').slice(0,750000),xp:Math.max(0,Number(d.xp)||0),xp7:ev.filter((e:any)=>Date.parse(e.date)>=d7).reduce((a:number,e:any)=>a+(Number(e.delta)||0),0),xp30:ev.filter((e:any)=>Date.parse(e.date)>=d30).reduce((a:number,e:any)=>a+(Number(e.delta)||0),0),completed:(d.completedMissions||[]).length+(d.completedContent||[]).length,visible:d.leaderboardVisible!==false}}).filter(x=>x.visible).slice(0,50)
      setQueryCache('leaderboard',leaders,5*60_000)
      return json({ok:true,leaders})
    }

    if (url.pathname === '/api/admin/students' && request.method === 'GET') {
      const admin = await requireAdmin(request, env)
      if (!admin) return json({ok:false,error:'Admin access required.'},403)
      const studentsCached=getQueryCache<any[]>('students')
      if(studentsCached)return json({ok:true,students:studentsCached})
      await ensureDb(env)
      const [rows,missions,items,accessRows,placementRows,placementHistoryRows]=await Promise.all([
        env.DB.prepare('SELECT user_id, data, updated_at FROM progress ORDER BY updated_at DESC').all<{user_id:string;data:string;updated_at:string}>(),
        listMissions(env,true),listContent(env,undefined,true),
        env.DB.prepare('SELECT user_id,levels FROM course_access').all<{user_id:string;levels:string}>(),
        env.DB.prepare('SELECT user_id,data FROM placement_results').all<{user_id:string;data:string}>(),
        env.DB.prepare('SELECT user_id,data,created_at FROM placement_history ORDER BY created_at ASC').all<{user_id:string;data:string;created_at:string}>()
      ])
      const historyMap=new Map<string,any[]>();for(const r of placementHistoryRows.results||[]){let x:any=null;try{x=JSON.parse(r.data)}catch{};if(x){const a=historyMap.get(r.user_id)||[];a.push(x);historyMap.set(r.user_id,a)}};const accessMap=new Map((accessRows.results||[]).map(r=>{let x:CourseLevel[]=[];try{x=JSON.parse(r.levels)}catch{}return [r.user_id,x] as const}));const placementMap=new Map((placementRows.results||[]).map(r=>{let x:any=null;try{x=JSON.parse(r.data)}catch{}return [r.user_id,x] as const}))
      const missionNames=new Map(missions.map(x=>[x.id,x.title]))
      const contentNames=new Map(items.map(x=>[x.id,x.title]))
      const students=(rows.results||[]).map(r=>{const d:any=JSON.parse(r.data||'{}');const xp=Math.max(0,Number(d.xp)||0);const lvl=levelForXp(xp);const answers=Math.max(0,Number(d.answerCount)||0),correct=Math.max(0,Number(d.correctAnswers)||0);const stats=d.sectionStats||{};const weakTopics=Object.entries(stats).map(([name,v]:any)=>({name,total:Number(v.total)||0,correct:Number(v.correct)||0,accuracy:v.total?Math.round(v.correct/v.total*100):0})).filter((x:any)=>x.total>=2).sort((a:any,b:any)=>a.accuracy-b.accuracy).slice(0,4);const fav=Object.entries(stats).sort((a:any,b:any)=>(Number(b[1]?.total)||0)-(Number(a[1]?.total)||0))[0]?.[0]||'—';const days=Array.isArray(d.activityDays)?d.activityDays:[];const cutoff7=Date.now()-7*86400000,cutoff30=Date.now()-30*86400000;return {userId:r.user_id,name:d.nickname||d.discordGlobalName||d.discordUsername||`Discord ${r.user_id}`,discordUsername:d.discordUsername||'',discordGlobalName:d.discordGlobalName||'',accessLevels:accessMap.get(r.user_id)||[],placement:placementMap.get(r.user_id)||null,placementHistory:historyMap.get(r.user_id)||[],xp,level:lvl?.name||'До BEGINNER',mistakes:Math.max(0,Number(d.mistakes)||0),correctAnswers:correct,answerCount:answers,accuracy:answers?Math.round(correct/answers*100):0,favoriteSection:fav,active7:days.filter((x:string)=>Date.parse(x)>=cutoff7).length,active30:days.filter((x:string)=>Date.parse(x)>=cutoff30).length,weakTopics,firstSeen:d.firstSeen||r.updated_at,lastSeen:d.lastSeen||r.updated_at,completedMissions:(d.completedMissions||[]).map((id:number)=>({id,title:missionNames.get(id)||`Миссия #${id}`})),completedContent:(d.completedContent||[]).map((id:number)=>({id,title:contentNames.get(id)||`Материал #${id}`})),events:Array.isArray(d.events)?d.events.slice(-20):[]}})
      setQueryCache('students',students,30_000)
      return json({ok:true,students})
    }

    const accessMatch=url.pathname.match(/^\/api\/admin\/students\/(\d+)\/access$/)
    if(accessMatch&&request.method==='PUT'){const admin=await requireAdmin(request,env);if(!admin)return json({ok:false,error:'Admin access required.'},403);await ensureDb(env);const body=await request.json<any>().catch(()=>({}));const incoming=(Array.isArray(body.levels)?body.levels:[]).filter((x:any)=>COURSE_LEVELS.includes(x));const existing=await readCourseAccess(env,accessMatch[1]);const levels=Array.from(new Set(body.replace===true?incoming:[...existing,...incoming]));const updatedAt=new Date().toISOString();await env.DB.prepare('INSERT OR REPLACE INTO course_access (user_id,levels,updated_at) VALUES (?,?,?)').bind(accessMatch[1],JSON.stringify(levels),updatedAt).run();const signalPublished=await publishAccessSignal(env,accessMatch[1],levels,updatedAt);clearQueryCache('students');return json({ok:true,levels,signalPublished,warning:signalPublished?null:'Доступ сохранён в D1. KV не настроен или временно недоступен: ученику потребуется повторная авторизация для обновления доступа.'})}

    // Admin-only incident viewer: never polls and never records student activity by itself.
    if(url.pathname==='/api/admin/incidents'&&request.method==='GET'){
      const admin=await requireAdmin(request,env);if(!admin)return json({ok:false,error:'Admin required'},403);
      await ensureDb(env);
      const rows=await env.DB.prepare('SELECT category, user_id, message, COUNT(*) AS repeats, MAX(created_at) AS last_at FROM server_incidents GROUP BY category,user_id,message ORDER BY last_at DESC LIMIT 100').all<any>();
      return json({ok:true,incidents:rows.results||[]});
    }
    const restoreMatch=url.pathname.match(/^\/api\/admin\/students\/(\d+)\/restore-xp$/);
    if(restoreMatch&&request.method==='POST'){
      const admin=await requireAdmin(request,env);if(!admin)return json({ok:false,error:'Admin required'},403);
      const body=await request.json<any>().catch(()=>({}));
      const amount=Number(body.amount),reason=String(body.reason||'').trim().slice(0,300);
      if(!Number.isSafeInteger(amount)||amount<1||amount>10000||reason.length<8)return json({ok:false,error:'Specify 1–10000 XP and a reason (8+ characters)'},400);
      await ensureDb(env);
      const uid=restoreMatch[1],now=new Date().toISOString();
      const row=await env.DB.prepare('SELECT data FROM progress WHERE user_id=?').bind(uid).first<{data:string}>();
      if(!row)return json({ok:false,error:'Student not found'},404);
      const old=JSON.parse(row.data),xp=Math.max(0,Number(old.xp)||0),updated={...old,xp:xp+amount,xpEvents:[...(old.xpEvents||[]),{date:now,delta:amount,reason:'admin restoration'}].slice(-120),events:[...(old.events||[]),{date:now,type:'admin',text:`Restored ${amount} XP: ${reason}`}].slice(-80)};
      const saved=await env.DB.prepare('UPDATE progress SET data=?,updated_at=? WHERE user_id=? AND data=?').bind(JSON.stringify(updated),now,uid,row.data).run();
      if(!saved.meta.changes)return json({ok:false,error:'Progress changed; refresh student and retry'},409);
      await env.DB.prepare('INSERT INTO admin_audit (actor_id,user_id,action,detail,created_at) VALUES (?,?,?,?,?)').bind(admin.id,uid,'restore_xp',JSON.stringify({amount,reason,before:xp,after:updated.xp}),now).run();
      await publishProgressSignal(env,uid);
      clearQueryCache('students');
      const roleSync=await syncDiscordLevelRole(env,uid,updated.xp);
      if(!roleSync.ok)await env.DB.prepare('INSERT INTO server_incidents (category,user_id,message,created_at) VALUES (?,?,?,?)').bind('role_sync',uid,'Discord role sync failed after XP restoration',now).run().catch(()=>null);
      return json({ok:true,xp:updated.xp,roleSync});
    }
    const roleMatch=url.pathname.match(/^\/api\/admin\/students\/(\d+)\/sync-role$/);
    if(roleMatch&&request.method==='POST'){
      const admin=await requireAdmin(request,env);if(!admin)return json({ok:false,error:'Admin required'},403);
      await ensureDb(env);const row=await env.DB.prepare('SELECT data FROM progress WHERE user_id=?').bind(roleMatch[1]).first<{data:string}>();if(!row)return json({ok:false,error:'Student not found'},404);
      const xp=Math.max(0,Number(JSON.parse(row.data).xp)||0),roleSync=await syncDiscordLevelRole(env,roleMatch[1],xp);
      const now=new Date().toISOString();await env.DB.prepare('INSERT INTO admin_audit (actor_id,user_id,action,detail,created_at) VALUES (?,?,?,?,?)').bind(admin.id,roleMatch[1],'sync_role',JSON.stringify({xp,roleSync}),now).run();
      if(!roleSync.ok)await env.DB.prepare('INSERT INTO server_incidents (category,user_id,message,created_at) VALUES (?,?,?,?)').bind('role_sync',roleMatch[1],'Manual Discord role sync failed',now).run().catch(()=>null);
      return json({ok:roleSync.ok,roleSync});
    }

    if (url.pathname === '/api/admin/export' && request.method === 'GET') {
      const admin=await requireAdmin(request,env);if(!admin)return json({ok:false,error:'Admin access required.'},403)
      await ensureDb(env);const scope=url.searchParams.get('scope')==='full'?'full':'changes'
      const [cm,cc,dm,dc,settings,progress,courseAccess,placementResults,placementHistory,placementConfig]=await Promise.all([
        env.DB.prepare('SELECT id,data,updated_at FROM missions').all<any>(),env.DB.prepare('SELECT id,section,data,updated_at FROM content').all<any>(),
        env.DB.prepare('SELECT id,deleted_at FROM deleted_missions').all<any>(),env.DB.prepare('SELECT id,deleted_at FROM deleted_content').all<any>(),
        env.DB.prepare('SELECT data,updated_at FROM settings WHERE id=1').first<any>(),env.DB.prepare('SELECT user_id,data,updated_at FROM progress').all<any>(),env.DB.prepare('SELECT user_id,levels,updated_at FROM course_access').all<any>(),env.DB.prepare('SELECT user_id,data,updated_at FROM placement_results').all<any>(),env.DB.prepare('SELECT user_id,data,created_at FROM placement_history').all<any>(),env.DB.prepare('SELECT data,updated_at FROM placement_config WHERE id=1').first<any>()])
      const changes={missions:cm.results||[],content:cc.results||[],deletedMissions:dm.results||[],deletedContent:dc.results||[],settings:settings||null,progress:scope==='full'?(progress.results||[]):[],courseAccess:courseAccess.results||[],placementResults:placementResults.results||[],placementHistory:placementHistory.results||[],placementConfig:placementConfig||null}
      const backup:any={format:'MEWAY-BACKUP-1',scope,createdAt:new Date().toISOString(),build:APP_CONTENT_VERSION,courseRoleIds:COURSE_ACCESS_ROLES,changes}
      if(scope==='full'){backup.full={missions:await listMissions(env,true),content:await listContent(env,undefined,true),settings:await getSettings(env)}}
      return json({ok:true,backup})
    }

    if (url.pathname === '/api/admin/import' && request.method === 'POST') {
      const admin=await requireAdmin(request,env);if(!admin)return json({ok:false,error:'Admin access required.'},403)
      const body=await request.json<any>().catch(()=>null);const b=body?.backup
      if(!b||b.format!=='MEWAY-BACKUP-1')return json({ok:false,error:'Unsupported MEWAY backup file.'},400)
      await ensureDb(env);const now=new Date().toISOString(),ch=b.changes||{}
      const stmts:any[]=[]
      for(const r of ch.missions||[])stmts.push(env.DB.prepare('INSERT OR REPLACE INTO missions (id,data,updated_at) VALUES (?,?,?)').bind(Number(r.id),String(r.data),String(r.updated_at||now)))
      for(const r of ch.content||[])stmts.push(env.DB.prepare('INSERT OR REPLACE INTO content (id,section,data,updated_at) VALUES (?,?,?,?)').bind(Number(r.id),String(r.section),String(r.data),String(r.updated_at||now)))
      for(const r of ch.deletedMissions||[])stmts.push(env.DB.prepare('INSERT OR REPLACE INTO deleted_missions (id,deleted_at) VALUES (?,?)').bind(Number(r.id),String(r.deleted_at||now)))
      for(const r of ch.deletedContent||[])stmts.push(env.DB.prepare('INSERT OR REPLACE INTO deleted_content (id,deleted_at) VALUES (?,?)').bind(Number(r.id),String(r.deleted_at||now)))
      for(const r of ch.progress||[])stmts.push(env.DB.prepare('INSERT OR REPLACE INTO progress (user_id,data,updated_at) VALUES (?,?,?)').bind(String(r.user_id),String(r.data),String(r.updated_at||now)));for(const r of ch.courseAccess||[])stmts.push(env.DB.prepare('INSERT OR REPLACE INTO course_access (user_id,levels,updated_at) VALUES (?,?,?)').bind(String(r.user_id),String(r.levels),String(r.updated_at||now)));for(const r of ch.placementHistory||[])stmts.push(env.DB.prepare('INSERT INTO placement_history (user_id,data,created_at) VALUES (?,?,?)').bind(String(r.user_id),String(r.data),String(r.created_at||now)));if(ch.placementConfig?.data)stmts.push(env.DB.prepare('INSERT OR REPLACE INTO placement_config (id,data,updated_at) VALUES (1,?,?)').bind(String(ch.placementConfig.data),String(ch.placementConfig.updated_at||now)));for(const r of ch.placementResults||[])stmts.push(env.DB.prepare('INSERT OR REPLACE INTO placement_results (user_id,data,updated_at) VALUES (?,?,?)').bind(String(r.user_id),String(r.data),String(r.updated_at||now)))
      if(ch.settings?.data)stmts.push(env.DB.prepare('INSERT OR REPLACE INTO settings (id,data,updated_at) VALUES (1,?,?)').bind(String(ch.settings.data),String(ch.settings.updated_at||now)))
      // A full backup can restore the complete visible curriculum even if the original static bundle later changes.
      if(b.scope==='full'&&b.full){for(const m of b.full.missions||[])stmts.push(env.DB.prepare('INSERT OR REPLACE INTO missions (id,data,updated_at) VALUES (?,?,?)').bind(Number(m.id),JSON.stringify(m),now));for(const x of b.full.content||[])stmts.push(env.DB.prepare('INSERT OR REPLACE INTO content (id,section,data,updated_at) VALUES (?,?,?,?)').bind(Number(x.id),String(x.section),JSON.stringify(x),now))}
      for(let i=0;i<stmts.length;i+=50)await env.DB.batch(stmts.slice(i,i+50))
      for(const k of ['missions','games','quizzes','words','challenges','rewards','settings'] as (keyof Revisions)[])await bumpRevision(env,k,now)
      clearPublic();clearQueryCache();return json({ok:true,restored:stmts.length})
    }

    if (url.pathname === '/api/admin/bootstrap' && request.method === 'GET') {
      const admin = await requireAdmin(request, env)
      if (!admin) return json({ ok: false, error: 'Admin access required.' }, 403)
      const section=url.searchParams.get('section')||undefined
      const [missions, items, settings] = await Promise.all([listMissions(env, true), section?listContent(env, section, true):Promise.resolve([] as ContentItem[]), getSettings(env)])
      return json({ ok: true, missions, items, settings })
    }

    if (url.pathname === '/api/admin/settings') {
      const admin=await requireAdmin(request,env);if(!admin)return json({ok:false,error:'Admin access required.'},403)
      if(request.method==='GET')return json({ok:true,settings:await getSettings(env)})
      if(request.method==='PUT'){
        const raw=await request.json<any>();const daily={...DEFAULT_SETTINGS.daily,...(raw.daily||{})},coach={...DEFAULT_SETTINGS.coach,...(raw.coach||{})},streak={...DEFAULT_SETTINGS.streak,...(raw.streak||{})}
        daily.target=Math.max(1,Math.min(100,Number(daily.target)||5));daily.rewardXp=Math.max(0,Math.min(1000,Number(daily.rewardXp)||0));coach.minAnswers=Math.max(1,Math.min(100,Number(coach.minAnswers)||4));coach.weakBelow=Math.max(1,Math.min(100,Number(coach.weakBelow)||75));coach.maxTopics=Math.max(1,Math.min(6,Number(coach.maxTopics)||3));streak.milestones=(Array.isArray(streak.milestones)?streak.milestones:[]).map(Number).filter((x:number)=>x>0&&x<=365).slice(0,12).sort((a:number,b:number)=>a-b)
        const settings={daily,coach,streak};await ensureDb(env);await env.DB.prepare('INSERT OR REPLACE INTO settings (id,data,updated_at) VALUES (1,?,?)').bind(JSON.stringify(settings),new Date().toISOString()).run();await bumpRevision(env,'settings');clearPublic();return json({ok:true,settings})
      }
    }

    if (url.pathname === '/api/admin/content') {
      const admin = await requireAdmin(request, env)
      if (!admin) return json({ ok: false, error: 'Admin access required.' }, 403)
      if (request.method === 'GET') { const section=url.searchParams.get('section')||undefined; return json({ ok: true, items: await listContent(env, section, true) }) }
      if (request.method === 'POST') {
        const item = await request.json<ContentItem>(); item.id = Date.now()
        await ensureDb(env)
        await env.DB.prepare('INSERT INTO content (id, section, data, updated_at) VALUES (?, ?, ?, ?)').bind(item.id,item.section,JSON.stringify(item),new Date().toISOString()).run()
        await env.DB.prepare('DELETE FROM deleted_content WHERE id = ?').bind(item.id).run(); await bumpRevision(env,item.section); clearPublic(); clearQueryCache('merged-content:')
        return json({ok:true,item},201)
      }
    }

    const contentMatch = url.pathname.match(/^\/api\/admin\/content\/(\d+)$/)
    if (contentMatch) {
      const admin = await requireAdmin(request, env)
      if (!admin) return json({ok:false,error:'Admin access required.'},403)
      const id=Number(contentMatch[1]); await ensureDb(env)
      if (request.method === 'PUT') {
        const item=await request.json<ContentItem>(); item.id=id
        await env.DB.prepare('INSERT OR REPLACE INTO content (id, section, data, updated_at) VALUES (?, ?, ?, ?)').bind(id,item.section,JSON.stringify(item),new Date().toISOString()).run()
        await env.DB.prepare('DELETE FROM deleted_content WHERE id = ?').bind(id).run(); await bumpRevision(env,item.section); clearPublic(); clearQueryCache('merged-content:')
        return json({ok:true,item})
      }
      if (request.method === 'DELETE') { const now=new Date().toISOString(); const row=await env.DB.prepare('SELECT section FROM content WHERE id=?').bind(id).first<{section:string}>(); const builtIn=builtInContent.find(x=>x.id===id)||(await loadGeneratedContent(env)).find(x=>x.id===id); const sec=(row?.section||builtIn?.section||'games') as keyof Revisions; let changes=0; if(builtIn){const results=await env.DB.batch([env.DB.prepare('DELETE FROM content WHERE id = ?').bind(id),env.DB.prepare('INSERT OR REPLACE INTO deleted_content (id,deleted_at) VALUES (?,?)').bind(id,now)]);changes=results[0]?.meta?.changes||0}else{const result=await env.DB.prepare('DELETE FROM content WHERE id = ?').bind(id).run();changes=result.meta?.changes||0} await bumpRevision(env,sec,now); clearPublic(); clearQueryCache('merged-content:'); return json({ok:true,deleted:id,changes}) }
    }

    if (url.pathname === '/api/missions' && request.method === 'GET') {
      const user=await requireUser(request);if(!user)return json({ok:false,error:'Discord authentication required.'},401)
      const requestedLimit=Math.max(0,Math.min(2000,Number(url.searchParams.get('limit'))||0))
      const hit=!requestedLimit?cachedPublic('missions'):null
      if(hit) return json({ok:true,missions:(hit as Mission[]).map(studentMission),settings:await getSettings(env),partial:false})
      const missions=await listMissions(env)
      const limit=Math.max(0,Math.min(2000,Number(url.searchParams.get('limit'))||0))
      const result=limit?missions.slice(0,limit):missions
      const safeResult=result.map(studentMission)
      if(!limit)setPublic('missions',safeResult)
      return json({ok:true,missions:safeResult,settings:await getSettings(env),partial:Boolean(limit)})
    }

    if (url.pathname === '/api/admin/missions') {
      const admin = await requireAdmin(request, env)
      if (!admin) return json({ ok: false, error: 'Admin access required.' }, 403)
      await ensureDb(env)
      if (request.method === 'GET') return json({ ok: true, missions: await listMissions(env, true) })
      if (request.method === 'POST') {
        const mission = await request.json<Mission>()
        mission.id = Date.now()
        await env.DB.prepare('INSERT INTO missions (id, data, updated_at) VALUES (?, ?, ?)').bind(mission.id, JSON.stringify(mission), new Date().toISOString()).run()
        await env.DB.prepare('DELETE FROM deleted_missions WHERE id = ?').bind(mission.id).run(); await bumpRevision(env,'missions'); clearPublic(); clearQueryCache('merged-missions:')
        return json({ ok: true, mission }, 201)
      }
    }

    const match = url.pathname.match(/^\/api\/admin\/missions\/(\d+)$/)
    if (match) {
      const admin = await requireAdmin(request, env)
      if (!admin) return json({ ok: false, error: 'Admin access required.' }, 403)
      await ensureDb(env)
      const id = Number(match[1])
      if (request.method === 'PUT') {
        const mission = await request.json<Mission>(); mission.id = id
        await env.DB.prepare('INSERT OR REPLACE INTO missions (id, data, updated_at) VALUES (?, ?, ?)').bind(id, JSON.stringify(mission), new Date().toISOString()).run()
        await env.DB.prepare('DELETE FROM deleted_missions WHERE id = ?').bind(id).run(); await bumpRevision(env,'missions'); clearPublic(); clearQueryCache('merged-missions:')
        return json({ ok: true, mission })
      }
      if (request.method === 'DELETE') {
        const now=new Date().toISOString(),builtIn=seed.some(m=>m.id===id)||(await loadGeneratedMissions(env)).some(m=>m.id===id)
        let changes=0
        if(builtIn){const results=await env.DB.batch([env.DB.prepare('DELETE FROM missions WHERE id = ?').bind(id),env.DB.prepare('INSERT OR REPLACE INTO deleted_missions (id,deleted_at) VALUES (?,?)').bind(id,now)]);changes=results[0]?.meta?.changes||0}
        else{const result=await env.DB.prepare('DELETE FROM missions WHERE id = ?').bind(id).run();changes=result.meta?.changes||0}
        await bumpRevision(env,'missions',now); clearPublic(); clearQueryCache('merged-missions:')
        return json({ ok: true, deleted: id, changes })
      }
    }

    if (url.pathname.startsWith('/api/')) return json({ ok: false, error: 'API route not found.' }, 404)
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
