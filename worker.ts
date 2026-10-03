interface Env {
  ASSETS: Fetcher
  DB: D1Database
  DISCORD_CLIENT_ID: string
  DISCORD_CLIENT_SECRET: string
  ADMIN_DISCORD_ID: string
}

type DiscordUser = { id: string; username: string; global_name?: string | null; avatar?: string | null }

type Mission = {
  id: number; title: string; description: string; category: string; level: string
  xp: number; icon: string; duration: string; status: 'published' | 'draft' | 'archived'
  tasks: Array<{ id: number; question: string; options: string[]; correctAnswer: string; explanation: string }>
}

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

async function ensureDb(env: Env) {
  await env.DB.exec(`CREATE TABLE IF NOT EXISTS missions (id INTEGER PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL);`)
  const row = await env.DB.prepare('SELECT COUNT(*) AS count FROM missions').first<{ count: number }>()
  if (!row?.count) {
    for (const mission of seed) {
      await env.DB.prepare('INSERT INTO missions (id, data, updated_at) VALUES (?, ?, ?)').bind(mission.id, JSON.stringify(mission), new Date().toISOString()).run()
    }
  }
}

async function getDiscordUser(token: string): Promise<DiscordUser | null> {
  const r = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${token}` } })
  return r.ok ? (await r.json()) as DiscordUser : null
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

    if (url.pathname === '/api/missions' && request.method === 'GET') {
      return json({ ok: true, missions: await listMissions(env) })
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
        return json({ ok: true, mission })
      }
      if (request.method === 'DELETE') {
        await env.DB.prepare('DELETE FROM missions WHERE id = ?').bind(id).run()
        return json({ ok: true })
      }
    }

    if (url.pathname.startsWith('/api/')) return json({ ok: false, error: 'API route not found.' }, 404)
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
