import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
test('A1 retains generated word illustrations',()=>assert.match(source,/item\.level==='A1'\?wordVisual\(word,item\.category\):word\.image/));
test('A2-C2 require an actual uploaded image in grid',()=>assert.match(source,/item\.level==='A1'\|\|\(typeof word\.image==='string'&&word\.image\.trim\(\)\)/));
test('A2-C2 require an actual uploaded image in expanded card',()=>assert.match(source,/item\.level==='A1'\|\|\(typeof w\.image==='string'&&w\.image\.trim\(\)\)/));
test('admin image upload stays available',()=>assert.match(source,/label="Фото карточки"/));
