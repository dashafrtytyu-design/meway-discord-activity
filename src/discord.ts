import { cacheGet, cacheSet } from './persistentCache'
export const DISCORD_CLIENT_ID = '1555208386742587444'

export type MewayDiscordUser = {
  id: string
  username: string
  globalName: string | null
  avatar: string | null
}

export type MewayAuthResult = {
  connected: boolean
  authenticated: boolean
  role: 'admin' | 'student' | null
  user: MewayDiscordUser | null
  accessToken?: string
  accessLevels?: Array<'A1'|'A2'|'B1'|'B2'|'C1'|'C2'>
  revisions?: Record<string,string>
  appVersion?: string
  progress?: Record<string, unknown> | null
  placementCompleted?: boolean
  placementResult?: Record<string, unknown> | null
  assistantKnowledge?: Array<Record<string, any>>
  assistantInbox?: any[]
  uiConfig?: Record<string, any>
  learningCatalog?: {missions:Array<{id:number;level:string}>;content:Array<{id:number;section:string;level:string}>}
  error?: string
}

function isDiscordActivity(): boolean {
  const params = new URLSearchParams(window.location.search)
  return params.has('frame_id') || params.has('instance_id') || params.has('channel_id')
}

export async function initializeDiscord(): Promise<MewayAuthResult> {
  if (!isDiscordActivity()) {
    return { connected: false, authenticated: false, role: null, user: null }
  }

  try {
    const { DiscordSDK } = await import('@discord/embedded-app-sdk')
    const discordSdk = new DiscordSDK(DISCORD_CLIENT_ID)
    await discordSdk.ready()

    // LOCAL-FIRST AUTH BOOTSTRAP. Re-opening MEWAY must not hit the Worker/D1
    // again while Discord still accepts the previously issued access token.
    // The complete bootstrap is encrypted in IndexedDB. If the token expires,
    // authenticate() fails and we transparently fall back to the normal OAuth
    // exchange below (one server bootstrap request).
    try {
      const lastUserId = localStorage.getItem('meway-recovery-user') || ''
      if (lastUserId) {
        const cached = await cacheGet<MewayAuthResult>(`auth-bootstrap:${lastUserId}`)
        const auth = cached?.data
        if (auth?.authenticated && auth.accessToken && auth.user?.id === lastUserId) {
          await discordSdk.commands.authenticate({ access_token: auth.accessToken })
          // V7.31.5 LOCAL-FIRST: never query D1 just because the Activity was reopened.
          // A tiny cacheable content-signal may be checked by the browser, but it is served
          // from Cloudflare/browser cache and does not read student/progress/content tables.
          // D1 delta reads happen only after the signal says that content really changed.
          try {
            const signal = await fetch('/api/content-signal', {
              headers: { Accept: 'application/json' },
              cache: 'default',
            }).then(r => r.ok ? r.json() : null) as any
            if (signal?.ok && signal.revisions) {
              const changed = Object.keys(signal.revisions).some(k => String(signal.revisions[k] || '0') !== String(auth.revisions?.[k] || '0'))
              const appChanged = Boolean(signal.appVersion && signal.appVersion !== auth.appVersion)
              if (changed || appChanged) {
                const next={...auth,revisions:signal.revisions,appVersion:signal.appVersion||auth.appVersion}
                await cacheSet(`auth-bootstrap:${lastUserId}`,{data:next,revision:JSON.stringify(signal.revisions),appVersion:signal.appVersion||auth.appVersion||'',savedAt:Date.now()})
                return next
              }
            }
          } catch {}
          return auth
        }
      }
    } catch {
      // Expired/invalid token or cleared cache: use the single normal bootstrap.
    }

    const { code } = await discordSdk.commands.authorize({
      client_id: DISCORD_CLIENT_ID,
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: ['identify'],
    })

    if (!code) throw new Error('Discord не вернул код авторизации.')

    const response = await fetch('/api/auth/discord', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const data = (await response.json()) as {
      ok?: boolean
      error?: string
      accessToken?: string
      accessLevels?: Array<'A1'|'A2'|'B1'|'B2'|'C1'|'C2'>
      revisions?: Record<string,string>
      appVersion?: string
      progress?: Record<string, unknown> | null
      placementCompleted?: boolean
      placementResult?: Record<string, unknown> | null
  assistantKnowledge?: Array<Record<string, any>>
  assistantInbox?: any[]
  uiConfig?: Record<string, any>
  learningCatalog?: {missions:Array<{id:number;level:string}>;content:Array<{id:number;section:string;level:string}>}
      role?: 'admin' | 'student'
      user?: MewayDiscordUser
    }

    if (!response.ok || !data.ok || !data.accessToken || !data.user) {
      throw new Error(data.error || 'Не удалось войти в MEWAY.')
    }

    await discordSdk.commands.authenticate({ access_token: data.accessToken })

    // SAFE CACHE RECOVERY — no additional network request. The authenticated
    // bootstrap is persisted locally as an encrypted per-user recovery snapshot.
    // If site storage was cleared, the same Discord account receives its D1-backed
    // state here and MEWAY immediately rebuilds the local working copy.
    const authResult: MewayAuthResult = {
      connected: true, authenticated: true, role: data.role ?? 'student', user: data.user,
      accessToken: data.accessToken, accessLevels: data.accessLevels || [], revisions: data.revisions || {},
      appVersion: data.appVersion || '', progress: data.progress || null,
      placementCompleted: data.placementCompleted === true, placementResult: data.placementResult || null,
      assistantKnowledge: data.assistantKnowledge || [], assistantInbox: data.assistantInbox || [],
      uiConfig: data.uiConfig || undefined, learningCatalog: data.learningCatalog || {missions:[],content:[]},
    }
    const recovery = {
      userId: data.user.id, role: data.role ?? 'student', accessLevels: data.accessLevels || [],
      revisions: data.revisions || {}, progress: data.progress || null,
      placementCompleted: data.placementCompleted === true, placementResult: data.placementResult || null, recoveredAt: Date.now(),
    }
    try {
      const meta={revision:JSON.stringify(data.revisions || {}),appVersion:data.appVersion || '',savedAt:Date.now()}
      await Promise.all([
        cacheSet(`recovery:${data.user.id}`, { data: recovery, ...meta }),
        cacheSet(`auth-bootstrap:${data.user.id}`, { data: authResult, ...meta }),
      ])
      localStorage.setItem('meway-recovery-user', data.user.id)
      if (data.progress && !localStorage.getItem('meway-progress')) localStorage.setItem('meway-progress', JSON.stringify(data.progress))
      if (data.placementResult && !localStorage.getItem('meway-placement-result')) localStorage.setItem('meway-placement-result', JSON.stringify(data.placementResult))
    } catch {}
    return authResult
  } catch (error) {
    console.error('MEWAY Discord auth:', error)
    return {
      connected: true,
      authenticated: false,
      role: null,
      user: null,
      error: error instanceof Error ? error.message : 'Ошибка авторизации Discord.',
    }
  }
}
