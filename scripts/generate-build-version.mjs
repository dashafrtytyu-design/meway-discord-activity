import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
const files=['contentSeed.ts','worker.ts','src/App.tsx','src/data.ts','src/storage.ts','src/App.css','src/index.css']
const hash=createHash('sha256')
for(const file of files){hash.update(file);hash.update(await readFile(new URL(`../${file}`,import.meta.url)))}
const id=`7.31.1-${hash.digest('hex').slice(0,16)}`
await writeFile(new URL('../buildVersion.ts',import.meta.url),`// Generated automatically before every production build. Do not edit.\nexport const MEWAY_BUILD_ID = ${JSON.stringify(id)} as const\n`)
console.log(`MEWAY build id: ${id}`)
