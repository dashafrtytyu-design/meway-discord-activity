#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
DB="meway-content"
DIR="meway_curriculum_20261029"
if [ ! -f "$DIR/FINAL_REFRESH.sql" ]; then echo 'SQL package missing'; exit 2; fi
read -r -p "Import 600 NEW educational items into remote D1 ${DB}? Type IMPORT: " consent
if [ "$consent" != 'IMPORT' ]; then echo 'Cancelled; database unchanged'; exit 1; fi
BACKUP="meway-d1-backup-$(date +%Y%m%d-%H%M%S).sql"
echo "Creating backup at $BACKUP (never commit/share this file; it contains student data)."
npx wrangler d1 export "$DB" --remote --output="$BACKUP"
echo "Backup created. Starting 12 idempotent additive SQL files."
for file in "$DIR"/ADD_*.sql; do
  echo "Importing $file"
  npx wrangler d1 execute "$DB" --remote --file="$file" --yes
done
npx wrangler d1 execute "$DB" --remote --file="$DIR/FINAL_REFRESH.sql" --yes
echo 'Imported. Check that mission=200, quiz=200, challenge=200 and verify the app.'
