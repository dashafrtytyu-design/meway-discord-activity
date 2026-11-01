import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8')
const worker=readFileSync(new URL('../worker.ts',import.meta.url),'utf8')
const css=readFileSync(new URL('../src/App.css',import.meta.url),'utf8')

test('admin content editor fetches full selected item, not all item payloads on tab change',()=>{
 assert.match(app,/\/api\/admin\/content\?section=\$\{encodeURIComponent\(sec\)\}&compact=1/)
 assert.match(app,/visibleList=filteredList\.slice\(0,visibleLimit\)/)
 assert.match(app,/\/api\/admin\/content\/\$\{x\.id\}\?section=\$\{encodeURIComponent\(x\.section\)\}/)
 assert.match(worker,/const compact=url\.searchParams\.get\('compact'\)==='1'/)
 assert.match(worker,/items\.map\(i=>\(\{\.\.\.i,payload:\{\}\}\)\)/)
})

test('word editor retains locally loaded full dictionary for duplicate warnings',()=>{
 assert.match(app,/const ensureWordLibrary=async\(\)=>/)
 assert.match(app,/if\(x\.section==='words'\)await ensureWordLibrary\(\)/)
 assert.match(app,/if\(section==='words'\)\{setNotice/)
 assert.match(app,/allContent=\{editContent\.section==='words'\?editorWordLibrary:content\}/)
})

test('level-up text is white and admin student XP refresh remains deliberate and D1-backed',()=>{
 assert.match(css,/\.app \.levelUpToast > div > span,[\s\S]*?\.app \.levelUpToast > div > small\{color:#fff!important\}/)
 assert.match(app,/void loadPage\(null,'',true\)/)
 assert.match(app,/XP берётся из D1 на момент обновления/)
 assert.match(worker,/COALESCE\(json_extract\(p\.data,'\$\.xp'\),0\) AS xp/)
 assert.doesNotMatch(app,/setInterval\(.*loadPage/)
})
