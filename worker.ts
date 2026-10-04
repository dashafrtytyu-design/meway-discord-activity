interface Env {
  ASSETS: Fetcher
  DB: D1Database
  DISCORD_CLIENT_ID: string
  DISCORD_CLIENT_SECRET: string
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
  if(failed){console.error('Discord role sync failed',failed.status);return {ok:false,configured:true,role:target?.name||null}}
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
  ]}
]

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=UTF-8', 'Cache-Control': 'no-store' } })
}

let dbReady = false
let contentSeedChecked = false

// Warm-isolate caches reduce repeated D1 reads and Discord identity lookups.
const publicCache = new Map<string,{expires:number,data:unknown}>()
const identityCache = new Map<string,{expires:number,user:DiscordUser}>()
const PUBLIC_TTL_MS = 10 * 60 * 1000
const IDENTITY_TTL_MS = 5 * 60 * 1000
function cachedPublic(key:string){const hit=publicCache.get(key);if(!hit||hit.expires<Date.now()){publicCache.delete(key);return null}return hit.data}
function setPublic(key:string,data:unknown){publicCache.set(key,{expires:Date.now()+PUBLIC_TTL_MS,data})}
function clearPublic(){publicCache.clear()}


async function ensureDb(env: Env) {
  if (dbReady) return
  await env.DB.exec(`CREATE TABLE IF NOT EXISTS missions (id INTEGER PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS content (id INTEGER PRIMARY KEY, section TEXT NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS progress (user_id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL, updated_at TEXT NOT NULL);`)
  const row = await env.DB.prepare('SELECT COUNT(*) AS count FROM missions').first<{ count: number }>()
  if (!row?.count) {
    for (const mission of seed) {
      await env.DB.prepare('INSERT INTO missions (id, data, updated_at) VALUES (?, ?, ?)').bind(mission.id, JSON.stringify(mission), new Date().toISOString()).run()
    }
  }
  dbReady = true
}


async function seedContent(env: Env) {
  if (contentSeedChecked) return
  await ensureDb(env)
  const samples: ContentItem[] = [
    {id:101,section:'games',title:'Найди перевод',description:'Выбирай правильный перевод и собирай серию точных ответов.',status:'published',level:'A1',icon:'🎯',xp:15,category:'Слова',payload:{gameType:'word-match',words:[{ru:'Самолёт',en:'Plane'},{ru:'Билет',en:'Ticket'},{ru:'Багаж',en:'Luggage'},{ru:'Паспорт',en:'Passport'}]}},
    {id:102,section:'games',title:'Собери слово',description:'Собери английское слово из перемешанных букв.',status:'published',level:'A1',icon:'🔤',xp:15,category:'Слова',payload:{gameType:'word-builder',words:[{ru:'Путешествие',en:'Travel'},{ru:'Аэропорт',en:'Airport'}]}},
    {id:103,section:'games',title:'Memory Cards',description:'Найди пары русского и английского слова.',status:'published',level:'A2',icon:'🧠',xp:20,category:'Память',payload:{gameType:'memory',words:[{ru:'Дом',en:'House'},{ru:'Книга',en:'Book'},{ru:'Вода',en:'Water'},{ru:'Друг',en:'Friend'}]}},
    {id:104,section:'games',title:'Speed English',description:'Отвечай быстро и набирай комбо.',status:'published',level:'A2',icon:'⚡',xp:25,category:'Скорость',payload:{gameType:'speed',words:[{ru:'Быстро',en:'Fast'},{ru:'Медленно',en:'Slow'}]}},
    {id:105,section:'games',title:'Grammar Race',description:'Выбирай правильную форму и двигайся к финишу.',status:'published',level:'B1',icon:'🏁',xp:30,category:'Грамматика',payload:{gameType:'grammar-race',words:[{ru:'идёт',en:'goes'},{ru:'играют',en:'play'}]}},
    {id:106,section:'games',title:'Лишнее слово',description:'Найди слово, которое не подходит к теме.',status:'published',level:'A2',icon:'🔎',xp:20,category:'Смешанное',payload:{gameType:'odd-one',words:[{ru:'яблоко',en:'apple'},{ru:'банан',en:'banana'},{ru:'поезд',en:'train'}],oddAnswer:'train'}},
    {id:107,section:'games',title:'Что на фото?',description:'Посмотри на изображение и выбери английское слово.',status:'published',level:'A1',icon:'🖼️',xp:20,category:'Фото',payload:{gameType:'image-guess',words:[{ru:'Вишня',en:'Cherry',transcription:'/ˈtʃer.i/',image:''},{ru:'Яблоко',en:'Apple',transcription:'/ˈæp.əl/',image:''},{ru:'Банан',en:'Banana',transcription:'/bəˈnɑː.nə/',image:''}]}},
    {id:108,section:'games',title:'Собери предложение',description:'Расставь английские слова в правильном порядке.',status:'published',level:'A2',icon:'🧩',xp:25,category:'Предложения',payload:{gameType:'sentence-order',words:[{ru:'Я люблю путешествовать',en:'I love to travel',hint:'I love to travel'},{ru:'Она читает каждый день',en:'She reads every day',hint:'She reads every day'}]}},
    {id:109,section:'games',title:'Правда или ложь',description:'Определи, верно ли английское утверждение.',status:'published',level:'A2',icon:'✅',xp:20,category:'Смешанное',payload:{gameType:'true-false',words:[{ru:'Кошка',en:'cat',hint:'Кошка = cat'},{ru:'Собака',en:'dog',hint:'Собака = cat'}]}},
    {id:110,section:'games',title:'Пропущенное слово',description:'Вставь правильное английское слово в предложение.',status:'published',level:'B1',icon:'✍️',xp:30,category:'Грамматика',payload:{gameType:'missing-word',words:[{ru:'путешествовать',en:'travel',hint:'I love to ___ in summer.'},{ru:'учиться',en:'study',hint:'I ___ English every day.'}]}},
    {id:111,section:'games',title:'Напиши перевод',description:'Введи английский перевод самостоятельно.',status:'published',level:'A1',icon:'⌨️',xp:25,category:'Слова',payload:{gameType:'translation-input',words:[{ru:'Дом',en:'house',transcription:'/haʊs/'},{ru:'Книга',en:'book',transcription:'/bʊk/'}]}},
    {id:112,section:'games',title:'Разложи по категориям',description:'Определи, к какой теме относится слово.',status:'published',level:'A2',icon:'🗂️',xp:25,category:'Смешанное',payload:{gameType:'category-sort',words:[{ru:'Яблоко',en:'Apple',category:'Еда'},{ru:'Самолёт',en:'Plane',category:'Путешествия'},{ru:'Учитель',en:'Teacher',category:'Школа'}]}},
    {id:201,section:'quizzes',title:'Quick Grammar A1',description:'Короткая проверка базовой грамматики.',status:'published',level:'A1',icon:'📝',xp:20,category:'Грамматика',payload:{questions:[{id:1,question:'She ___ English every day.',options:['study','studies','studying','studied'],correctAnswer:'studies',explanation:'С she в Present Simple добавляем -s/-es.'}]}},
    {id:301,section:'words',title:'Путешествия',description:'Главные слова для аэропорта, поездки и отеля.',status:'published',level:'A1',icon:'✈️',xp:0,category:'Путешествия',payload:{words:[{ru:'Самолёт',en:'Plane',transcription:'/pleɪn/',image:'',example:'The plane is ready.'},{ru:'Багаж',en:'Luggage',transcription:'/ˈlʌɡ.ɪdʒ/',image:'',example:'My luggage is heavy.'},{ru:'Билет',en:'Ticket',transcription:'/ˈtɪk.ɪt/',image:'',example:'Here is my ticket.'}]}},
    {id:401,section:'challenges',title:'7 дней английского',description:'Выполняй одно короткое задание каждый день.',status:'published',level:'A1',icon:'🔥',xp:100,category:'Серия',payload:{goal:'Не пропустить 7 дней подряд',instructions:'Каждый день открой MEWAY и заверши хотя бы одну миссию или квиз.',reward:'Значок «7 Day Streak» + 100 XP'}},
    {id:501,section:'rewards',title:'First Flight',description:'Твоя первая награда в MEWAY.',status:'published',level:'A1',icon:'🏆',xp:0,category:'Достижения',payload:{goal:'Заверши первую миссию',instructions:'Пройди любую опубликованную миссию до конца.',reward:'Значок First Flight'}}
  ]
  const existing = await env.DB.prepare('SELECT id FROM content').all<{id:number}>()
  const ids = new Set(existing.results.map(r=>Number(r.id)))
  for (const x of samples) if (!ids.has(x.id)) await env.DB.prepare('INSERT INTO content (id, section, data, updated_at) VALUES (?, ?, ?, ?)').bind(x.id,x.section,JSON.stringify(x),new Date().toISOString()).run()
  contentSeedChecked = true
}

async function listContent(env: Env, section?: string, all = false) {
  await ensureDb(env); await seedContent(env)
  const result = section ? await env.DB.prepare('SELECT data FROM content WHERE section = ? ORDER BY id DESC').bind(section).all<{data:string}>() : await env.DB.prepare('SELECT data FROM content ORDER BY id DESC').all<{data:string}>()
  const items = result.results.map(r=>JSON.parse(r.data) as ContentItem)
  return all ? items : items.filter(x=>x.status==='published')
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
  const result = await env.DB.prepare('SELECT data FROM missions ORDER BY id DESC').all<{ data: string }>()
  const items = result.results.map((r) => JSON.parse(r.data) as Mission)
  return all ? items : items.filter((m) => m.status === 'published')
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/health') {
      return json({ ok: true, app: 'MEWAY', backend: 'Cloudflare Worker', config: {
        clientId: Boolean(env.DISCORD_CLIENT_ID), clientSecret: Boolean(env.DISCORD_CLIENT_SECRET), adminId: Boolean(env.ADMIN_DISCORD_ID), database: Boolean(env.DB)
      }})
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
      return json({ ok: true, accessToken: token.access_token, role: user.id === env.ADMIN_DISCORD_ID ? 'admin' : 'student', user: {
        id: user.id, username: user.username, globalName: user.global_name ?? null, avatar: user.avatar ?? null
      }})
    }



    if (url.pathname === '/api/progress') {
      const user = await requireUser(request)
      if (!user) return json({ ok: false, error: 'Discord authentication required.' }, 401)
      await ensureDb(env)
      if (request.method === 'GET') {
        const row = await env.DB.prepare('SELECT data, updated_at FROM progress WHERE user_id = ?').bind(user.id).first<{data:string;updated_at:string}>()
        const now=new Date().toISOString()
        const base:any = { xp: 120, completedMissions: [], completedContent: [], nickname: '', avatar: '', mistakes: 0, correctAnswers:0, answerCount:0, activityDays:[], sectionStats:{}, leaderboardVisible:true, firstSeen: now, lastSeen: now, discordUsername: user.username, discordGlobalName: user.global_name ?? '' }
        const previous:any=row?.data?JSON.parse(row.data):{};const progress:any = row?.data ? { ...base, ...previous, lastSeen: now, discordUsername:user.username, discordGlobalName:user.global_name??'' } : base; const today=now.slice(0,10);const hadToday=Array.isArray(previous.activityDays)&&previous.activityDays.includes(today);progress.activityDays=Array.from(new Set([...(progress.activityDays||[]),today])).slice(-60)
        const desired=levelForXp(progress.xp)?.id||'';const roleSync=await syncDiscordLevelRole(env,user.id,progress.xp);if(roleSync.ok){progress.syncedRoleId=desired;progress.roleVerifiedAt=now}
        // GET always verifies the real Discord role, but D1 is written only when useful: first visit, new active day, role repair, identity change, or a 15-minute last-seen checkpoint.
        const lastMs=Date.parse(previous.lastSeen||row?.updated_at||'')||0;const identityChanged=previous.discordUsername!==user.username||previous.discordGlobalName!==(user.global_name??'');const shouldWrite=!row||!hadToday||Boolean(roleSync.changed)||identityChanged||Date.now()-lastMs>15*60*1000
        if(shouldWrite)await env.DB.prepare('INSERT OR REPLACE INTO progress (user_id, data, updated_at) VALUES (?, ?, ?)').bind(user.id, JSON.stringify(progress), now).run()
        return json({ ok: true, progress })
      }
      if (request.method === 'PUT') {
        const data = await request.json<any>().catch(()=>null)
        if (!data || typeof data !== 'object') return json({ok:false,error:'Invalid progress.'},400)
        const oldRow=await env.DB.prepare('SELECT data FROM progress WHERE user_id = ?').bind(user.id).first<{data:string}>()
        const old:any=oldRow?.data?JSON.parse(oldRow.data):{}
        const now=new Date().toISOString()
        const safe:any = { xp: Math.max(0, Number(data.xp)||0), completedMissions: Array.isArray(data.completedMissions)?data.completedMissions.slice(0,1000):[], completedContent: Array.isArray(data.completedContent)?data.completedContent.slice(0,2000):[], nickname: String(data.nickname||'').slice(0,40), avatar: String(data.avatar||'').slice(0,750000), mistakes: Math.max(0,Number(data.mistakes??old.mistakes)||0), correctAnswers:Math.max(0,Number(data.correctAnswers??old.correctAnswers)||0), answerCount:Math.max(0,Number(data.answerCount??old.answerCount)||0), activityDays:Array.isArray(data.activityDays)?data.activityDays.slice(-60):Array.isArray(old.activityDays)?old.activityDays.slice(-60):[], sectionStats:(data.sectionStats&&typeof data.sectionStats==='object')?data.sectionStats:(old.sectionStats||{}), dailyAnswers:Math.max(0,Number(data.dailyAnswers??old.dailyAnswers)||0),dailyMissionCount:Math.max(0,Number(data.dailyMissionCount??old.dailyMissionCount)||0),dailyContentCount:Math.max(0,Number(data.dailyContentCount??old.dailyContentCount)||0),dailyAnswerDate:String(data.dailyAnswerDate ?? old.dailyAnswerDate ?? '').slice(0,10),dailyClaimDate:String(data.dailyClaimDate ?? old.dailyClaimDate ?? '').slice(0,10),leaderboardVisible:data.leaderboardVisible!==false, xpEvents:Array.isArray(old.xpEvents)?old.xpEvents.slice(-120):[], events:Array.isArray(old.events)?old.events.slice(-80):[], firstSeen: old.firstSeen||now, lastSeen: now, discordUsername:user.username, discordGlobalName:user.global_name??'' }
        const oldXp=Math.max(0,Number(old.xp)||0);if(safe.xp>oldXp){safe.xpEvents=[...(safe.xpEvents||[]),{date:now,delta:safe.xp-oldXp}].slice(-120)}
        const addEvent=(type:string,text:string)=>{safe.events=[...(safe.events||[]),{date:now,type,text}].slice(-80)}
        const oldLevel=levelForXp(oldXp),newLevel=levelForXp(safe.xp);if(newLevel?.id&&newLevel.id!==oldLevel?.id)addEvent('level',`достиг(ла) уровня ${newLevel.name}`)
        const oldM=new Set<number>(Array.isArray(old.completedMissions)?old.completedMissions:[]),oldC=new Set<number>(Array.isArray(old.completedContent)?old.completedContent:[]);if(safe.completedMissions.some((id:number)=>!oldM.has(id)))addEvent('mission','завершил(а) новую миссию');if(safe.completedContent.some((id:number)=>!oldC.has(id)))addEvent('content','завершил(а) новый материал')
        const oldStreak=streakForDays(old.activityDays),newStreak=streakForDays(safe.activityDays),cfg=await getSettings(env);for(const milestone of cfg.streak.milestones){if(oldStreak<milestone&&newStreak>=milestone)addEvent('streak',`достиг(ла) серии ${milestone} дней 🔥`)}
        const desired=levelForXp(safe.xp)?.id||''
        if(old.syncedRoleId!==desired){const roleSync=await syncDiscordLevelRole(env,user.id,safe.xp);if(roleSync.ok){safe.syncedRoleId=desired;safe.roleVerifiedAt=now}else safe.syncedRoleId=old.syncedRoleId||''}else{safe.syncedRoleId=old.syncedRoleId||'';safe.roleVerifiedAt=old.roleVerifiedAt||''}
        await env.DB.prepare('INSERT OR REPLACE INTO progress (user_id, data, updated_at) VALUES (?, ?, ?)').bind(user.id, JSON.stringify(safe), now).run()
        return json({ok:true,progress:safe})
      }
    }

    if (url.pathname === '/api/content' && request.method === 'GET') {
      const section=url.searchParams.get('section') || undefined
      const key=`content:${section||'all'}`
      const hit=cachedPublic(key)
      if(hit) return json({ok:true,items:hit})
      const items=await listContent(env,section)
      setPublic(key,items)
      return json({ok:true,items})
    }


    if (url.pathname === '/api/leaderboard' && request.method === 'GET') {
      await ensureDb(env)
      const rows=await env.DB.prepare('SELECT user_id, data FROM progress').all<{user_id:string;data:string}>()
      const now=Date.now(),d7=now-7*86400000,d30=now-30*86400000;const leaders=(rows.results||[]).map(r=>{const d:any=JSON.parse(r.data||'{}');const ev=Array.isArray(d.xpEvents)?d.xpEvents:[];return {userId:r.user_id,name:d.nickname||d.discordGlobalName||d.discordUsername||'Ученик MEWAY',xp:Math.max(0,Number(d.xp)||0),xp7:ev.filter((e:any)=>Date.parse(e.date)>=d7).reduce((a:number,e:any)=>a+(Number(e.delta)||0),0),xp30:ev.filter((e:any)=>Date.parse(e.date)>=d30).reduce((a:number,e:any)=>a+(Number(e.delta)||0),0),completed:(d.completedMissions||[]).length+(d.completedContent||[]).length,visible:d.leaderboardVisible!==false}}).filter(x=>x.visible).slice(0,50)
      return json({ok:true,leaders})
    }

    if (url.pathname === '/api/admin/students' && request.method === 'GET') {
      const admin = await requireAdmin(request, env)
      if (!admin) return json({ok:false,error:'Admin access required.'},403)
      await ensureDb(env)
      const [rows,missions,items]=await Promise.all([
        env.DB.prepare('SELECT user_id, data, updated_at FROM progress ORDER BY updated_at DESC').all<{user_id:string;data:string;updated_at:string}>(),
        listMissions(env,true),listContent(env,undefined,true)
      ])
      const missionNames=new Map(missions.map(x=>[x.id,x.title]))
      const contentNames=new Map(items.map(x=>[x.id,x.title]))
      const students=(rows.results||[]).map(r=>{const d:any=JSON.parse(r.data||'{}');const xp=Math.max(0,Number(d.xp)||0);const lvl=levelForXp(xp);const answers=Math.max(0,Number(d.answerCount)||0),correct=Math.max(0,Number(d.correctAnswers)||0);const stats=d.sectionStats||{};const weakTopics=Object.entries(stats).map(([name,v]:any)=>({name,total:Number(v.total)||0,correct:Number(v.correct)||0,accuracy:v.total?Math.round(v.correct/v.total*100):0})).filter((x:any)=>x.total>=2).sort((a:any,b:any)=>a.accuracy-b.accuracy).slice(0,4);const fav=Object.entries(stats).sort((a:any,b:any)=>(Number(b[1]?.total)||0)-(Number(a[1]?.total)||0))[0]?.[0]||'—';const days=Array.isArray(d.activityDays)?d.activityDays:[];const cutoff7=Date.now()-7*86400000,cutoff30=Date.now()-30*86400000;return {userId:r.user_id,name:d.nickname||d.discordGlobalName||d.discordUsername||`Discord ${r.user_id}`,discordUsername:d.discordUsername||'',xp,level:lvl?.name||'До BEGINNER',mistakes:Math.max(0,Number(d.mistakes)||0),correctAnswers:correct,answerCount:answers,accuracy:answers?Math.round(correct/answers*100):0,favoriteSection:fav,active7:days.filter((x:string)=>Date.parse(x)>=cutoff7).length,active30:days.filter((x:string)=>Date.parse(x)>=cutoff30).length,weakTopics,firstSeen:d.firstSeen||r.updated_at,lastSeen:d.lastSeen||r.updated_at,completedMissions:(d.completedMissions||[]).map((id:number)=>({id,title:missionNames.get(id)||`Миссия #${id}`})),completedContent:(d.completedContent||[]).map((id:number)=>({id,title:contentNames.get(id)||`Материал #${id}`})),events:Array.isArray(d.events)?d.events.slice(-20):[]}})
      return json({ok:true,students})
    }

    if (url.pathname === '/api/admin/bootstrap' && request.method === 'GET') {
      const admin = await requireAdmin(request, env)
      if (!admin) return json({ ok: false, error: 'Admin access required.' }, 403)
      const [missions, items, settings] = await Promise.all([listMissions(env, true), listContent(env, undefined, true), getSettings(env)])
      return json({ ok: true, missions, items, settings })
    }

    if (url.pathname === '/api/admin/settings') {
      const admin=await requireAdmin(request,env);if(!admin)return json({ok:false,error:'Admin access required.'},403)
      if(request.method==='GET')return json({ok:true,settings:await getSettings(env)})
      if(request.method==='PUT'){
        const raw=await request.json<any>();const daily={...DEFAULT_SETTINGS.daily,...(raw.daily||{})},coach={...DEFAULT_SETTINGS.coach,...(raw.coach||{})},streak={...DEFAULT_SETTINGS.streak,...(raw.streak||{})}
        daily.target=Math.max(1,Math.min(100,Number(daily.target)||5));daily.rewardXp=Math.max(0,Math.min(1000,Number(daily.rewardXp)||0));coach.minAnswers=Math.max(1,Math.min(100,Number(coach.minAnswers)||4));coach.weakBelow=Math.max(1,Math.min(100,Number(coach.weakBelow)||75));coach.maxTopics=Math.max(1,Math.min(6,Number(coach.maxTopics)||3));streak.milestones=(Array.isArray(streak.milestones)?streak.milestones:[]).map(Number).filter((x:number)=>x>0&&x<=365).slice(0,12).sort((a:number,b:number)=>a-b)
        const settings={daily,coach,streak};await ensureDb(env);await env.DB.prepare('INSERT OR REPLACE INTO settings (id,data,updated_at) VALUES (1,?,?)').bind(JSON.stringify(settings),new Date().toISOString()).run();clearPublic();return json({ok:true,settings})
      }
    }

    if (url.pathname === '/api/admin/content') {
      const admin = await requireAdmin(request, env)
      if (!admin) return json({ ok: false, error: 'Admin access required.' }, 403)
      if (request.method === 'GET') return json({ ok: true, items: await listContent(env, undefined, true) })
      if (request.method === 'POST') {
        const item = await request.json<ContentItem>(); item.id = Date.now()
        await ensureDb(env)
        await env.DB.prepare('INSERT INTO content (id, section, data, updated_at) VALUES (?, ?, ?, ?)').bind(item.id,item.section,JSON.stringify(item),new Date().toISOString()).run()
        clearPublic()
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
        clearPublic()
        return json({ok:true,item})
      }
      if (request.method === 'DELETE') { const result=await env.DB.prepare('DELETE FROM content WHERE id = ?').bind(id).run(); clearPublic(); return json({ok:true,deleted:id,changes:result.meta.changes}) }
    }

    if (url.pathname === '/api/missions' && request.method === 'GET') {
      const hit=cachedPublic('missions')
      if(hit) return json({ok:true,missions:hit,settings:await getSettings(env)})
      const missions=await listMissions(env)
      setPublic('missions',missions)
      return json({ok:true,missions,settings:await getSettings(env)})
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
        clearPublic()
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
        clearPublic()
        return json({ ok: true, mission })
      }
      if (request.method === 'DELETE') {
        const result = await env.DB.prepare('DELETE FROM missions WHERE id = ?').bind(id).run()
        clearPublic()
        return json({ ok: true, deleted: id, changes: result.meta.changes })
      }
    }

    if (url.pathname.startsWith('/api/')) return json({ ok: false, error: 'API route not found.' }, 404)
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
