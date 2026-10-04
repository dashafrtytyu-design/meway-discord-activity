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
] as const
function levelForXp(xp:number){ return [...LEVEL_ROLES].reverse().find(x=>xp>=x.xp) || null }
async function syncDiscordLevelRole(env:Env,userId:string,xp:number){
  if(!env.DISCORD_BOT_TOKEN||!env.DISCORD_GUILD_ID) return {ok:false,configured:false}
  const target=levelForXp(xp)
  const headers={Authorization:`Bot ${env.DISCORD_BOT_TOKEN}`}
  for(const role of LEVEL_ROLES){
    if(role.id===target?.id) continue
    const r=await fetch(`https://discord.com/api/v10/guilds/${env.DISCORD_GUILD_ID}/members/${userId}/roles/${role.id}`,{method:'DELETE',headers})
    if(!r.ok&&r.status!==404) console.error('Discord role remove failed',role.name,r.status)
  }
  if(target){
    const r=await fetch(`https://discord.com/api/v10/guilds/${env.DISCORD_GUILD_ID}/members/${userId}/roles/${target.id}`,{method:'PUT',headers})
    if(!r.ok){ console.error('Discord role add failed',target.name,r.status,await r.text()); return {ok:false,configured:true,role:target.name} }
  }
  return {ok:true,configured:true,role:target?.name||null,roleId:target?.id||null}
}

type Mission = {
  id: number; title: string; description: string; category: string; level: string
  xp: number; icon: string; duration: string; status: 'published' | 'draft' | 'archived'
  tasks: Array<{ id: number; question: string; options: string[]; correctAnswer: string; explanation: string }>
}

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
const PUBLIC_TTL_MS = 2 * 60 * 1000
const IDENTITY_TTL_MS = 5 * 60 * 1000
function cachedPublic(key:string){const hit=publicCache.get(key);if(!hit||hit.expires<Date.now()){publicCache.delete(key);return null}return hit.data}
function setPublic(key:string,data:unknown){publicCache.set(key,{expires:Date.now()+PUBLIC_TTL_MS,data})}
function clearPublic(){publicCache.clear()}


async function ensureDb(env: Env) {
  if (dbReady) return
  await env.DB.exec(`CREATE TABLE IF NOT EXISTS missions (id INTEGER PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS content (id INTEGER PRIMARY KEY, section TEXT NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS progress (user_id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL);`)
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
        const base:any = { xp: 120, completedMissions: [], completedContent: [], nickname: '', avatar: '', mistakes: 0, firstSeen: now, lastSeen: now, discordUsername: user.username, discordGlobalName: user.global_name ?? '' }
        const progress:any = row?.data ? { ...base, ...JSON.parse(row.data), lastSeen: now, discordUsername:user.username, discordGlobalName:user.global_name??'' } : base
        const desired=levelForXp(progress.xp)?.id||''
        if(progress.syncedRoleId!==desired){const roleSync=await syncDiscordLevelRole(env,user.id,progress.xp);if(roleSync.ok)progress.syncedRoleId=desired}
        await env.DB.prepare('INSERT OR REPLACE INTO progress (user_id, data, updated_at) VALUES (?, ?, ?)').bind(user.id, JSON.stringify(progress), now).run()
        return json({ ok: true, progress })
      }
      if (request.method === 'PUT') {
        const data = await request.json<any>().catch(()=>null)
        if (!data || typeof data !== 'object') return json({ok:false,error:'Invalid progress.'},400)
        const oldRow=await env.DB.prepare('SELECT data FROM progress WHERE user_id = ?').bind(user.id).first<{data:string}>()
        const old:any=oldRow?.data?JSON.parse(oldRow.data):{}
        const now=new Date().toISOString()
        const safe:any = { xp: Math.max(0, Number(data.xp)||0), completedMissions: Array.isArray(data.completedMissions)?data.completedMissions.slice(0,1000):[], completedContent: Array.isArray(data.completedContent)?data.completedContent.slice(0,2000):[], nickname: String(data.nickname||'').slice(0,40), avatar: String(data.avatar||'').slice(0,750000), mistakes: Math.max(0,Number(data.mistakes??old.mistakes)||0), firstSeen: old.firstSeen||now, lastSeen: now, discordUsername:user.username, discordGlobalName:user.global_name??'' }
        const desired=levelForXp(safe.xp)?.id||''
        if(old.syncedRoleId!==desired){const roleSync=await syncDiscordLevelRole(env,user.id,safe.xp);if(roleSync.ok)safe.syncedRoleId=desired;else safe.syncedRoleId=old.syncedRoleId||''}else safe.syncedRoleId=old.syncedRoleId||''
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
      const students=(rows.results||[]).map(r=>{const d:any=JSON.parse(r.data||'{}');const xp=Math.max(0,Number(d.xp)||0);const lvl=levelForXp(xp);return {userId:r.user_id,name:d.nickname||d.discordGlobalName||d.discordUsername||`Discord ${r.user_id}`,discordUsername:d.discordUsername||'',xp,level:lvl?.name||'До BEGINNER',mistakes:Math.max(0,Number(d.mistakes)||0),firstSeen:d.firstSeen||r.updated_at,lastSeen:d.lastSeen||r.updated_at,completedMissions:(d.completedMissions||[]).map((id:number)=>({id,title:missionNames.get(id)||`Миссия #${id}`})),completedContent:(d.completedContent||[]).map((id:number)=>({id,title:contentNames.get(id)||`Материал #${id}`}))}})
      return json({ok:true,students})
    }

    if (url.pathname === '/api/admin/bootstrap' && request.method === 'GET') {
      const admin = await requireAdmin(request, env)
      if (!admin) return json({ ok: false, error: 'Admin access required.' }, 403)
      const [missions, items] = await Promise.all([listMissions(env, true), listContent(env, undefined, true)])
      return json({ ok: true, missions, items })
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
      if(hit) return json({ok:true,missions:hit})
      const missions=await listMissions(env)
      setPublic('missions',missions)
      return json({ok:true,missions})
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
