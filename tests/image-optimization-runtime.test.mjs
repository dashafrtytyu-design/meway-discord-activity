import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
const start=source.indexOf('async function optimizeMaterialImage(');
const end=source.indexOf('\nfunction GameEditor(',start);
assert.ok(start>=0&&end>start);
const code=source.slice(start,end).replace('file:File','file').replace(':Promise<string>','');
test('real image optimizer downscales and releases bitmap',async()=>{
 let closed=false,drawn=false;
 const canvas={width:0,height:0,getContext:()=>({drawImage:()=>{drawn=true}}),toDataURL:()=> 'data:image/jpeg;base64,TEST'};
 const ctx={createImageBitmap:async()=>({width:4000,height:2000,close:()=>{closed=true}}),document:{createElement:()=>canvas},Error,Math};
 vm.createContext(ctx);vm.runInContext(code+';globalThis.optimize=optimizeMaterialImage',ctx);
 const out=await ctx.optimize({type:'image/png',size:10000});
 assert.equal(out,'data:image/jpeg;base64,TEST');assert.equal(canvas.width,1024);assert.equal(canvas.height,512);assert.equal(drawn,true);assert.equal(closed,true);
});
test('rejects unsupported image files before conversion',async()=>{
 const ctx={Error};vm.createContext(ctx);vm.runInContext(code+';globalThis.optimize=optimizeMaterialImage',ctx);
 await assert.rejects(()=>ctx.optimize({type:'application/pdf',size:100}),/изображение/);
});
