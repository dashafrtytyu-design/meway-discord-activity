import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
test('all material image editor upload paths join the pending-save barrier',()=>{
  assert.match(src,/const uploadImage=\(i:number,file\?:File\)=>.*processMaterialImage\(file,image=>updateWord/);
  assert.match(src,/processMaterialImage\(f,image=>updateWord/);
  assert.match(src,/processMaterialImage\(f,image=>update\(i,\{image,imageDisabled:false\}\)/);
  assert.match(src,/await awaitMaterialImages\(\);const latest=xLatest\.current/);
});
test('image conversion failures do not falsely mark a save complete',()=>{
  assert.match(src,/Promise\.allSettled\(batch\)/);
  assert.match(src,/if\(failure\)throw new Error/);
});
