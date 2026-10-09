import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const outbox=readFileSync(new URL('../src/xpOutbox.ts',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
test('IndexedDB primary outbox is account-scoped',()=>{assert.match(outbox,/indexedDB\.open/);assert.match(outbox,/x\.userId===userId/);assert.match(outbox,/legacyRead\(userId\)/)});
test('queue acknowledgement only follows confirmed server progress',()=>{assert.match(app,/if\(!result\?\.ok \|\| !result\?\.progress\)/);assert.ok(app.indexOf('acknowledgeXpClaim(xpUserId,claim.operationId)')>app.indexOf('if(!result?.ok || !result?.progress)'))});
test('no periodic polling added',()=>{assert.doesNotMatch(outbox,/setInterval|setTimeout|fetch\(/);assert.match(app,/window\.addEventListener\('online',retry\)/)});
test('old queue is migrated and retained as fallback',()=>{assert.match(outbox,/if\(old\.length\)await transact/);assert.match(outbox,/catch\{return old\}/)});
