# MEWAY Discord Activity

Готовая база MEWAY: React/Vite frontend + Discord Embedded App SDK + Cloudflare Worker + D1 content database + защищённая админ-панель.

## Что уже подключено
- Discord Activity OAuth (`identify`)
- серверная проверка администратора по Discord User ID
- ученический интерфейс и профиль
- миссии с XP, ответами и объяснениями
- Cloudflare D1 для контента
- админ-панель: создать/редактировать/публиковать/архивировать/удалять миссии и вопросы
- адаптивный интерфейс

## Cloudflare: обязательные секреты
В Worker > Settings > Variables and Secrets добавьте как **Secret**:
- `DISCORD_CLIENT_SECRET` — OAuth2 Client Secret приложения Discord
- `ADMIN_DISCORD_ID` — Discord User ID администратора

`DISCORD_CLIENT_ID` уже является публичной переменной в `wrangler.jsonc`.

Не добавляйте секреты в GitHub.

## Discord Developer Portal
Activity должна использовать тот же Discord Application, Client ID которого указан в `src/discord.ts` и `wrangler.jsonc`.
Для Activity нужен scope `identify`.

## Deploy
Cloudflare build command: `npm run build`
Deploy command: `npx wrangler deploy`

`wrangler.jsonc` объявляет обязательные секреты. Если они не настроены, новый deploy должен остановиться с понятной ошибкой вместо публикации сломанной авторизации.

D1 binding `DB` называется `meway-content`. При первом API-запросе Worker создаёт таблицу `missions` и стартовые миссии автоматически.

## Проверка
После deploy откройте `/api/health`. Все четыре поля `config` должны быть `true`.
Затем полностью закройте MEWAY Activity в Discord и откройте снова. Для Discord ID, совпадающего с `ADMIN_DISCORD_ID`, в меню появится `Админ`.
