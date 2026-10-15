import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
test('admin section fetch has a bounded but extended timeout for large images',()=>{
 assert.match(src,/\/api\/admin\/content\?section=\$\{encodeURIComponent\(sec\)\}&limit=6&offset=0`.*,signal:AbortSignal\.timeout\(60000\)/);
});
test('admin timeout is explained and does not pretend that records were deleted',()=>{
 assert.match(src,/Сервер долго отвечает\. Сохранённые на устройстве материалы остаются доступными/);
 assert.match(src,/role=\{list\.length\?'status':'alert'\}/);
});
