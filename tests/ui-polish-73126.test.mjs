import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/App.css',import.meta.url),'utf8');

test('All directions includes all missions by default',()=>{
 assert.match(app,/levelMissions\.filter\(m=>!selectedTrack\|\|learningTrack\(m\)===selectedTrack\)/);
});
test('All directions includes quizzes, words and challenges while games keep independent filters',()=>{
 assert.match(app,/levelItems\.filter\(x=>!selectedTrack\|\|learningTrack\(x\)===selectedTrack\)/);
 assert.match(app,/page==='Игры'\|\|page==='Награды'\)\|\|!selectedTrack\|\|learningTrack\(x\)===selectedTrack/);
});
test('Category selector has an unambiguous default label',()=>{
 assert.match(app,/<b>Выбери категорию<\/b><select/);
 assert.match(app,/<option value="">Все направления<\/option>/);
 assert.doesNotMatch(app,/Все направления — выбери категорию/);
});
test('Placement Test uses topic correct-answer counts without changing its evaluation',()=>{
 assert.match(app,/<small>Правильно: \{x\.correct\} из \{x\.total\}/);
 assert.match(app,/<b title="Правильно по этой теме в текущем тесте">\{x\.percent\}%<\/b>/);
});
test('Mobile layout has explicit compact header override and a single active nav background',()=>{
 assert.match(css,/html\.mewayDiscordEmbedded \.app>main\{padding-top:18px!important;\}/);
 assert.match(css,/\.app\.blueTheme>aside nav button\.active i,[\s\S]*?background:transparent!important;/);
 assert.match(css,/\.app>aside nav button\.active::before,[\s\S]*?content:none!important;/);
});
test('Theme-aware selected level has white text, and filter glow has scrollport padding',()=>{
 assert.match(css,/\.app\.blueTheme \.mewayLevelRoute \.mewayLevelDots button\.active/);
 assert.match(css,/color:#fff!important;\s*-webkit-text-fill-color:#fff!important;/);
 assert.match(css,/\.app \.filterStack \.filters\{[\s\S]*?padding:14px 16px 20px;/);
});
