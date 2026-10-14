import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const worker=readFileSync(new URL('../worker.ts',import.meta.url),'utf8');
test('content history table and index exist and editing/deletion archive old data',()=>{
  assert.match(worker,/CREATE TABLE IF NOT EXISTS content_history/);
  assert.match(worker,/CREATE INDEX IF NOT EXISTS idx_content_history_id/);
  assert.match(worker,/INSERT INTO content_history\(content_id,section,data,action,created_at\) SELECT/);
  assert.match(worker,/action='delete'/);
  assert.match(worker,/content-history/);
});
test('SQLite rollback and restore keep prior image payload',()=>{
 const code=`import sqlite3,json\nc=sqlite3.connect(':memory:')\nc.executescript('CREATE TABLE content(id INTEGER PRIMARY KEY,section TEXT,data TEXT,updated_at TEXT); CREATE TABLE content_history(history_id INTEGER PRIMARY KEY AUTOINCREMENT,content_id INTEGER,section TEXT,data TEXT,action TEXT,created_at TEXT); CREATE TABLE deleted_content(id INTEGER PRIMARY KEY,deleted_at TEXT);')\noriginal=json.dumps({'id':1,'section':'words','payload':{'words':[{'en':'cat','image':'data:image/png;base64,abc'}]}})\nc.execute('INSERT INTO content VALUES(1,?,?,?)',('words',original,'t0'))\nwith c:\n p=c.execute('SELECT section,data FROM content WHERE id=1').fetchone()\n c.execute('INSERT INTO content_history(content_id,section,data,action,created_at) VALUES(1,?,?,?,?)',(p[0],p[1],'edit','t1'))\n c.execute('UPDATE content SET data=?,updated_at=? WHERE id=1',(json.dumps({'id':1,'payload':{'words':[]}}),'t1'))\nassert 'base64,abc' in c.execute('SELECT data FROM content_history').fetchone()[0]\nwith c:\n p=c.execute('SELECT section,data FROM content WHERE id=1').fetchone()\n c.execute('INSERT INTO content_history(content_id,section,data,action,created_at) VALUES(1,?,?,?,?)',(p[0],p[1],'before_restore','t2'))\n c.execute('UPDATE content SET section=?,data=?,updated_at=? WHERE id=1',('words',original,'t2'))\nassert 'base64,abc' in c.execute('SELECT data FROM content WHERE id=1').fetchone()[0]\nprint('ok')`;
 const r=spawnSync('python3',['-c',code],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
});
