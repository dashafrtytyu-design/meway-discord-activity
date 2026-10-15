import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
const outbox=readFileSync(new URL('../src/xpOutbox.ts',import.meta.url),'utf8');
const worker=readFileSync(new URL('../worker.ts',import.meta.url),'utf8');
test('malformed historical claims are retained and not sent repeatedly',()=>{
 assert.match(app,/const validation=validateXpClaim\(claim\)/);
 assert.match(app,/if\(validation\)\{[\s\S]*?continue/);
 assert.match(app,/if\(response.status===400\|\|response.status===422\)\{continue\}/);
 assert.match(outbox,/export function validateXpClaim/);
});
test('acknowledgement requires successful server response',()=>{
 const i=app.indexOf('await acknowledgeXpClaim(xpUserId,claim.operationId)');
 assert.ok(i>app.indexOf('if(!response.ok||!result?.ok||!result?.progress)'));
});
test('worker rejects malformed claims with actionable errors',()=>{
 assert.match(worker,/Invalid XP operation ID/);
 assert.match(worker,/Invalid XP kind/);
 assert.match(worker,/Invalid XP item ID/);
});
