interface Env {
  ASSETS: Fetcher
  DISCORD_CLIENT_ID?: string
  DISCORD_CLIENT_SECRET?: string
  ADMIN_DISCORD_ID?: string
}

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

    // Проверка, что backend MEWAY работает
    if (url.pathname === '/api/health') {
      return json({
        ok: true,
        app: 'MEWAY',
        backend: 'Cloudflare Worker',
      })
    }

    // Здесь позже будет безопасная Discord OAuth-авторизация
    if (url.pathname === '/api/auth/discord' && request.method === 'POST') {
      return json(
        {
          ok: false,
          message: 'Discord authentication is not configured yet.',
        },
        501,
      )
    }

    // Неизвестный API-маршрут
    if (url.pathname.startsWith('/api/')) {
      return json(
        {
          ok: false,
          error: 'API route not found',
        },
        404,
      )
    }

    // Всё остальное — существующий интерфейс MEWAY
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>