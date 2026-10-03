interface Env {
  ASSETS: Fetcher
  DISCORD_CLIENT_ID?: string
  DISCORD_CLIENT_SECRET?: string
  ADMIN_DISCORD_ID?: string
}

const REDIRECT_URI =
  'https://meway-discord-activity.dashafrtytyu.workers.dev/api/auth/discord/callback'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Cache-Control': 'no-store',
    },
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // Проверка backend
    if (url.pathname === '/api/health') {
      return json({
        ok: true,
        app: 'MEWAY',
        backend: 'Cloudflare Worker',
      })
    }

    // Обмен Discord authorization code на access token
    if (
      url.pathname === '/api/auth/discord' &&
      request.method === 'POST'
    ) {
      if (
        !env.DISCORD_CLIENT_ID ||
        !env.DISCORD_CLIENT_SECRET ||
        !env.ADMIN_DISCORD_ID
      ) {
        return json(
          {
            ok: false,
            error: 'Server authentication configuration is missing.',
          },
          500,
        )
      }

      let body: { code?: string }

      try {
        body = await request.json()
      } catch {
        return json(
          {
            ok: false,
            error: 'Invalid request body.',
          },
          400,
        )
      }

      if (!body.code) {
        return json(
          {
            ok: false,
            error: 'Discord authorization code is required.',
          },
          400,
        )
      }

      const tokenBody = new URLSearchParams({
        client_id: env.DISCORD_CLIENT_ID,
        client_secret: env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: body.code,
        redirect_uri: REDIRECT_URI,
      })

      const tokenResponse = await fetch(
        'https://discord.com/api/oauth2/token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: tokenBody,
        },
      )

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()

        console.error(
          'Discord token exchange failed:',
          tokenResponse.status,
          errorText,
        )

        return json(
          {
            ok: false,
            error: `Discord authorization failed: ${errorText}`,
          },
          401,
        )
      }

      const tokenData = (await tokenResponse.json()) as {
        access_token?: string
        token_type?: string
        expires_in?: number
        scope?: string
      }

      if (!tokenData.access_token) {
        return json(
          {
            ok: false,
            error: 'Discord did not return an access token.',
          },
          401,
        )
      }

      // Получаем настоящего Discord-пользователя
      const userResponse = await fetch(
        'https://discord.com/api/users/@me',
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        },
      )

      if (!userResponse.ok) {
        return json(
          {
            ok: false,
            error: 'Could not load Discord user.',
          },
          401,
        )
      }

      const discordUser = (await userResponse.json()) as {
        id: string
        username: string
        global_name?: string | null
        avatar?: string | null
      }

      // Роль определяется ТОЛЬКО на backend
      const role =
        discordUser.id === env.ADMIN_DISCORD_ID
          ? 'admin'
          : 'student'

      return json({
        ok: true,

        user: {
          id: discordUser.id,
          username: discordUser.username,
          globalName: discordUser.global_name ?? null,
          avatar: discordUser.avatar ?? null,
        },

        role,

        // Нужен frontend для discordSdk.authenticate()
        accessToken: tokenData.access_token,
      })
    }

    // Callback зарегистрирован в Discord Developer Portal
    if (url.pathname === '/api/auth/discord/callback') {
      return json({
        ok: true,
        message: 'MEWAY Discord OAuth callback is active.',
      })
    }

    // Неизвестные API-маршруты
    if (url.pathname.startsWith('/api/')) {
      return json(
        {
          ok: false,
          error: 'API route not found.',
        },
        404,
      )
    }

    // React-интерфейс MEWAY
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
