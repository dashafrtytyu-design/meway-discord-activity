import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
const root=process.cwd(), dist=join(root,'dist');
const forbiddenNames=['worker.ts','wrangler.jsonc','.env','.dev.vars','package-lock.json'];
const forbiddenText=[/DISCORD_CLIENT_SECRET\s*[:=]/i,/ADMIN_DISCORD_ID\s*[:=]\s*["'][0-9]+/i,/database_id\s*[:=]\s*["'][0-9a-f-]{16,}/i];
let files=[]; async function walk(d){for(const n of await readdir(d)){const p=join(d,n),s=await stat(p);s.isDirectory()?await walk(p):files.push(p)}}
try{await walk(dist)}catch{console.error('dist/ not found');process.exit(1)}
let bytes=0, bad=[]; for(const p of files){const s=await stat(p);bytes+=s.size;const rel=relative(dist,p);if(forbiddenNames.some(n=>rel.endsWith(n)))bad.push(`forbidden file: ${rel}`);if(/\.(js|css|html|json|txt|map)$/i.test(rel)){const t=await readFile(p,'utf8');for(const rx of forbiddenText)if(rx.test(t))bad.push(`possible secret in: ${rel}`)}}
console.log(`MEWAY production dist: ${(bytes/1024/1024).toFixed(2)} MiB (${files.length} files)`);
if(bad.length){console.error(bad.join('\n'));process.exit(2)} console.log('Security check: no known server-only files/secrets found in dist.');
