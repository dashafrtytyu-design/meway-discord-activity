import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8')
const css=readFileSync(new URL('../src/App.css',import.meta.url),'utf8')
const worker=readFileSync(new URL('../worker.ts',import.meta.url),'utf8')

test('only the level-up message has an explicit white-text override',()=>{
  assert.match(css,/\.app \.levelUpToast > div > span,[\s\S]*?\.app \.levelUpToast > div > small\{color:#fff!important\}/)
  assert.doesNotMatch(css,/\.levelUpToast,\.levelUpToast span,\.levelUpToast b,\.levelUpToast small\{color:#fff!important\}/)
  assert.match(app,/className="levelUpToast"/)
})

test('a locked A1–C2 filter can show locked material titles',()=>{
  assert.match(app,/onClick=\{\(\)=>setLevel\(x\)\} aria-label=\{locked\?`Посмотреть закрытый уровень \$\{x\}`/)
  assert.match(app,/onClick=\{\(\)=>setLevel\(c\)\} aria-label=\{locked\?`Посмотреть закрытый уровень \$\{c\}`/)
  assert.doesNotMatch(app,/disabled=\{locked\} onClick=\{\(\)=>\{if\(!locked\)setLevel/)
})

test('locked content and mission cards remain visible but cannot be opened',()=>{
  assert.match(app,/onClick=\{\(\)=>\{if\(access\.includes\(m\.level as CourseLevel\)&&!\(m as Mission&\{locked\?:boolean\}\)\.locked\)openMission\(m\)\}\}/)
  assert.match(app,/onClick=\{\(\)=>\{if\(!locked\)setSelected\(x\)\}\}/)
  assert.match(app,/Приобрети доступ, чтобы открыть задания/)
  assert.match(app,/Приобрети доступ, чтобы открыть материал/)
  assert.match(worker,/return allowed\.has\(m\.level\)\?safe:\{\.\.\.safe,description:'',tasks:\[\],locked:true\}/)
  assert.match(worker,/return allowed\.has\(x\.level\)\?safe:\{\.\.\.safe,description:'',payload:\{\},locked:true\}/)
})
