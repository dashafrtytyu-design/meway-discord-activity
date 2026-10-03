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
  error?: string
}

function isDiscordActivity(): boolean {
  const params = new URLSearchParams(window.location.search)

  return (
    params.has('frame_id') ||
    params.has('instance_id') ||
    params.has('channel_id')
  )
}

export async function initializeDiscord(): Promise<MewayAuthResult> {
  // Обычный браузер / StackBlitz:
  // Discord SDK вообще не загружаем.
  if (!isDiscordActivity()) {
    console.log('MEWAY: обычный браузер — Discord SDK пропущен')

    return {
      connected: false,
      authenticated: false,
      role: null,
      user: null,
    }
  }

  try {
    // Загружаем SDK только внутри Discord Activity
    const { DiscordSDK } = await import('@discord/embedded-app-sdk')

    const discordSdk = new DiscordSDK(DISCORD_CLIENT_ID)

    await discordSdk.ready()

    console.log('MEWAY: Discord SDK готов')

    const { code } = await discordSdk.commands.authorize({
      client_id: DISCORD_CLIENT_ID,
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: ['identify'],
    })

    if (!code) {
      throw new Error('Discord did not return an authorization code.')
    }

    // Отправляем временный authorization code нашему backend
    const response = await fetch('/api/auth/discord', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    })

    const data = (await response.json()) as {
      ok?: boolean
      error?: string
      accessToken?: string
      role?: 'admin' | 'student'
      user?: MewayDiscordUser
    }

    if (!response.ok || !data.ok || !data.accessToken || !data.user) {
      throw new Error(data.error || 'MEWAY authentication failed.')
    }

    // Завершаем авторизацию внутри Discord Activity
    await discordSdk.commands.authenticate({
      access_token: data.accessToken,
    })

    console.log(
      `MEWAY: авторизация готова — ${data.user.username} (${data.role})`,
    )

    return {
      connected: true,
      authenticated: true,
      role: data.role ?? 'student',
      user: data.user,
    }
  } catch (error) {
    console.error('MEWAY: ошибка Discord авторизации', error)

    return {
      connected: true,
      authenticated: false,
      role: null,
      user: null,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown Discord authentication error.',
    }
  }
}
