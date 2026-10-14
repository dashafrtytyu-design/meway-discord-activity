# MEWAY — исправление рейтинга и диагностика администратора

Изменено: src/App.tsx, worker.ts.

- Ошибка GET /api/leaderboard больше не преобразуется в пустой успешный список. Пользователь видит ошибку; существующий локальный рейтинг сохраняется.
- Некорректная JSON-строка одного профиля не обрывает построение всего рейтинга.
- Пустой рейтинг не кешируется на Worker на 5 минут.
- GET /api/auth/whoami (только по требованию) сообщает Discord userId, роль по серверному ADMIN_DISCORD_ID и наличие DB-привязки. Не раскрывает ADMIN_DISCORD_ID, не даёт прав, не изменяет данные.

Проверка: после публикации в DevTools Network найдите /api/auth/discord или /api/progress-signal и проверьте role. Если student — вызовите GET /api/auth/whoami с существующим Bearer токеном только в доверенной среде; не публикуйте токен. Сверьте userId с ADMIN_DISCORD_ID в Worker Production. Если admin, но вкладки нет, проверьте актуальность frontend deployment. Проверьте GET /api/leaderboard (HTTP 200 и leaders). В Cloudflare D1 проверьте только SELECT COUNT(*) FROM progress; и SELECT user_id,updated_at FROM progress LIMIT 10; .

Production build не подтверждён: npm ci не завершился в данной среде. Реальные Cloudflare и Discord не проверялись. Рабочая D1 не изменялась. Исправление отображения не доказывает восстановление рейтинга в production.
