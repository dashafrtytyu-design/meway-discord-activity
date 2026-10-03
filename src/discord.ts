import { DiscordSDK } from '@discord/embedded-app-sdk'

export const DISCORD_CLIENT_ID = '1555208386742587444'

let discordSdk: DiscordSDK | null = null

export async function initializeDiscord() {
  // Discord Activity передаёт frame_id в адресе.
  // Если его нет — значит MEWAY открыт как обычный сайт/в StackBlitz.
  const params = new URLSearchParams(window.location.search)
  const isDiscordActivity = params.has('frame_id')

  if (!isDiscordActivity) {
    console.log('MEWAY: обычный браузер — Discord SDK не запускаем')

    return {
      connected: false,
      channelId: null,
      guildId: null,
    }
  }

  try {
    // Создаём SDK ТОЛЬКО внутри Discord.
    discordSdk = new DiscordSDK(DISCORD_CLIENT_ID)

    await discordSdk.ready()

    console.log('MEWAY: Discord SDK готов ✅')

    return {
      connected: true,
      channelId: discordSdk.channelId ?? null,
      guildId: discordSdk.guildId ?? null,
    }
  } catch (error) {
    console.error('MEWAY: ошибка подключения Discord SDK', error)

    return {
      connected: false,
      channelId: null,
      guildId: null,
    }
  }
}