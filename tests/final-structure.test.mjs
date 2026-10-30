import {test} from 'node:test'
import {strict as assert} from 'node:assert'
import {readFileSync} from 'node:fs'
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8')
const worker=readFileSync(new URL('../worker.ts',import.meta.url),'utf8')
const styles=readFileSync(new URL('../src/App.css',import.meta.url),'utf8')
test('assistant removed from active route and API',()=>{
 assert.equal(app.includes('function MewayAssistant('),false)
 assert.equal(app.includes("['💬','Ассистент']"),false)
 assert.equal(worker.includes("url.pathname === '/api/assistant/"),false)
 assert.equal(worker.includes("url.pathname === '/api/admin/assistant/"),false)
})
test('admin track + topic exist for missions and all non-game content',()=>{
 assert.ok(app.includes('<Field label="Направление">'))
 assert.ok(app.includes('<Field label="Тема">'))
 assert.ok(app.includes("x.section!=='games'"))
 assert.ok(app.includes('track:x.track||learningTrack(x)'))
})
test('route game catalog reads compact identifiers from D1',()=>{
 assert.ok(worker.includes('async function gameProgressCatalog('))
 assert.ok(worker.includes("FROM content WHERE section='games' AND json_valid(data)"))
 assert.ok(worker.includes('compactLearningCatalog('))
})
test('known XP safety remains in place',()=>{
 assert.ok(app.includes('processXpQueue('))
 assert.ok(worker.includes('/api/xp/claim'))
 assert.ok(!worker.includes('DROP TABLE'))
})
test('colour theme support and new admin selector contrast exist',()=>{
 assert.ok(styles.includes('.darkTheme .formGrid select'))
 assert.ok(styles.includes('.blueTheme .formGrid select'))
})
