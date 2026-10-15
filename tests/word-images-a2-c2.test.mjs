import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
const wordCollection=source.split('function WordCollection(')[1].split('function QuizView(')[0];
test('word cards render English and Russian without image placeholders',()=>{
 assert.match(wordCollection,/word\.ru/);
 assert.match(wordCollection,/word\.en/);
 assert.doesNotMatch(wordCollection,/<img\b|wordVisual\(|word\.image|w\.image/);
});
test('expanded word cards contain no images',()=>{
 assert.match(wordCollection,/className="wordModal"/);
 assert.doesNotMatch(wordCollection,/<img\b/);
});
test('admin no longer offers image uploads for word cards',()=>assert.doesNotMatch(source,/label="Фото карточки"/));
