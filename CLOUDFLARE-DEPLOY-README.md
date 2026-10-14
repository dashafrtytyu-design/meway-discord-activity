# MEWAY — исправление ENOENT package.json в Cloudflare

Ошибка `/opt/buildhome/repo/package.json` означает, что команда `npm run build` запущена не в каталоге с package.json. В ЭТОМ ZIP package.json находится непосредственно в корне архива.

## Как загрузить в GitHub

1. Распакуйте ZIP на компьютере.
2. Откройте папку с package.json, src/, public/, worker.ts и wrangler.jsonc.
3. Загрузите **содержимое этой папки**, а не папку целиком, в корень GitHub-репозитория (либо настройте Root directory на вложенную папку).
4. Проверьте на главной странице GitHub, что `package.json` виден рядом с `src/`, `public/` и `worker.ts`.

## Cloudflare Pages — настройки

- Root directory: `/` (или оставьте пустым), ЕСЛИ package.json в корне репозитория.
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js: версия, совместимая с зависимостями из package.json (предпочтительно Node 24).
- Если проект находится в папке `MEWAY`, укажите Root directory `MEWAY`, либо перенесите содержимое в корень. Нельзя указывать произвольную папку.

В логе успешной конфигурации должны появиться установка зависимостей и запуск Vite/TypeScript. Если опять ENOENT — проблема в GitHub root/Cloudflare Root directory, а не в исходниках.

## Безопасность данных

НЕ удаляйте D1, KV, Worker secrets, существующие таблицы и настройки OAuth. Сначала сохраните резервную копию D1. Этот архив не содержит и не заменяет реальные данные учеников, хранящиеся в D1.

## Статус проверок

`node --test tests/*.test.mjs`: 44/44 пройдено. Полная установка npm и production build не подтверждены в этом окружении: недоступна часть npm-пакетов. Реальные D1/Discord и функциональные браузерные проверки не выполнены.
