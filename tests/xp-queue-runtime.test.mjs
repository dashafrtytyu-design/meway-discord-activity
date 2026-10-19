import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import vm from 'node:vm'
const require=createRequire(import.meta.url)
const ts=require(require.resolve('typescript'))
const source=readFileSync(new URL('../src/xpQueueRunner.ts',import.meta.url),'utf8')
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const exports={}
vm.runInNewContext(compiled,{exports,require:()=>({})})
const {processXpQueue}=exports
const claim=id=>({operationId:`operation_${id}`,kind:'content',itemId:String(id),completed:true})
const response=(status,body)=>({ok:status===200,status,json:async()=>body})
const run=async (statuses)=>{
 const queue=statuses.map((_,i)=>claim(i+1)),seen=[],ack=[],confirmed=[],rejected=[]
 await processXpQueue({userId:'u1',list:async()=>queue,acknowledge:async(_,id)=>ack.push(id),fetchClaim:async c=>{seen.push(c.itemId);const v=statuses[Number(c.itemId)-1];if(v==='network')throw Error('offline');return response(v,v===200?{ok:true,progress:{xp:10}}:{error:'Rejected'})},onConfirmed:r=>confirmed.push(r.progress.xp),onRejected:(c,status)=>rejected.push([c.itemId,status])})
 return {seen,ack,confirmed,rejected}
}
test('404 retained, later verified claim processed',async()=>{const r=await run([404,200]);assert.deepEqual(r.seen,['1','2']);assert.deepEqual(r.ack,['operation_2']);assert.deepEqual(r.rejected,[['1',404]])})
test('422 retained, later verified claim processed',async()=>{const r=await run([422,200]);assert.deepEqual(r.ack,['operation_2']);assert.equal(r.confirmed.length,1)})
test('network failure retains current and following claims',async()=>{const r=await run(['network',200]);assert.deepEqual(r.seen,['1']);assert.deepEqual(r.ack,[])})
test('server failure stops batch without deleting',async()=>{const r=await run([503,200]);assert.deepEqual(r.ack,[]);assert.deepEqual(r.seen,['1'])})
test('duplicate completion response can be acknowledged safely',async()=>{const r=await run([200]);assert.deepEqual(r.ack,['operation_1']);assert.deepEqual(r.confirmed,[10])})
