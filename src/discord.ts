import { DiscordSDK } from '@discord/embedded-app-sdk'

export const DISCORD_CLIENT_ID = '1555208386742587444'

export const discordSdk = new DiscordSDK(DISCORD_CLIENT_ID)

export async function initializeDiscord() {
  try {
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