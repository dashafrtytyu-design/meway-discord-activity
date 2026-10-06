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
      role?: 'admin' | 'student'
      user?: MewayDiscordUser
      accessLevels?: Array<'A1'|'A2'|'B1'|'B2'|'C1'|'C2'>
    }

    if (!response.ok || !data.ok || !data.accessToken || !data.user) {
      throw new Error(data.error || 'Не удалось войти в MEWAY.')
    }

    await discordSdk.commands.authenticate({ access_token: data.accessToken })

    return {
      connected: true,
      authenticated: true,
      role: data.role ?? 'student',
      user: data.user,
      accessToken: data.accessToken,
      accessLevels: data.accessLevels || [],
      revisions: data.revisions || {},
      appVersion: data.appVersion || '',
      progress: data.progress || null,
    }
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
