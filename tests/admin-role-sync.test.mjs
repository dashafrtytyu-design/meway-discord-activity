import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const client=readFileSync('src/discord.ts','utf8');
const worker=readFileSync('worker.ts','utf8');
assert(!client.includes('LOCAL_ADMIN_DISCORD_ID'), 'Client must not hardcode admin identity');
assert(client.includes("role: data.role === 'admin' ? 'admin' : 'student'"), 'OAuth role must come from server');
assert(client.includes("auth.role=signal.role"), 'Cached role must refresh on existing signal');
assert(worker.includes("role:user.id===String(env.ADMIN_DISCORD_ID || '').trim()?'admin':'student'"), 'Signal must contain server role');
assert(worker.includes("user.id === String(env.ADMIN_DISCORD_ID || '').trim()"), 'Admin API must remain protected server-side');
console.log('Admin role sync regression checks passed (5 assertions).');

assert(client.includes("if(!response.ok) throw new Error('Server role verification failed')"), 'Reject stale cached roles when verification fails');
assert(client.includes("if(!signal.ok || (signal.role!=='admin' && signal.role!=='student'))"), 'Require authoritative role');
assert(worker.includes("String(env.ADMIN_DISCORD_ID || '').trim()"), 'Trim accidental whitespace in Cloudflare admin ID');
