/** MEWAY local-first, account-scoped XP outbox. IndexedDB is the primary store.
 * A legacy localStorage queue is imported once and retained as a recovery fallback.
 * This module never calls Cloudflare. Server acknowledgement is required to delete. */
export type XpClaim={operationId:string;kind:string;itemId:string;answers?:string[];completed?:boolean}
const NAME='meway-xp-outbox-v1', STORE='claims'
function open():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{if(typeof indexedDB==='undefined')return reject(new Error('IndexedDB unavailable'));const r=indexedDB.open(NAME,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:'operationId'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function transact<T>(mode:IDBTransactionMode, action:(store:IDBObjectStore,done:(v:T)=>void)=>void):Promise<T>{const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode);let value:T;tx.oncomplete=()=>{db.close();resolve(value)};tx.onerror=()=>{db.close();reject(tx.error)};action(tx.objectStore(STORE),v=>{value=v})})}
function legacyKey(userId:string){return `meway-xp-queue-${userId}`}
function legacyRead(userId:string):XpClaim[]{try{const v=JSON.parse(localStorage.getItem(legacyKey(userId))||'[]');return Array.isArray(v)?v.filter(x=>x&&typeof x.operationId==='string'):[]}catch{return []}}
function legacyWrite(userId:string,items:XpClaim[]){try{localStorage.setItem(legacyKey(userId),JSON.stringify(items))}catch{}}
export async function listXpClaims(userId:string):Promise<XpClaim[]>{
 if(!userId||userId==='anonymous')return []
 const old=legacyRead(userId)
 try{
  // Import old queue before reading. Repeating this is safe (same operation IDs).
  if(old.length)await transact<void>('readwrite',(store,done)=>{for(const claim of old)store.put({...claim,userId});done()})
  const all=await transact<Array<XpClaim&{userId:string}>>('readonly',(store,done)=>{const r=store.getAll();r.onsuccess=()=>done(r.result||[])})
  const own=all.filter(x=>x.userId===userId).map(({userId:_id,...claim})=>claim)
  // Mirror is a fallback, never the sole source when IndexedDB is available.
  legacyWrite(userId,own);return own
 }catch{return old}
}
export async function addXpClaim(userId:string,claim:XpClaim):Promise<boolean>{
 if(!userId||userId==='anonymous')return false
 const current=await listXpClaims(userId)
 if(current.some(x=>x.kind===claim.kind&&x.itemId===claim.itemId))return true
 const next=[...current,claim]
 try{await transact<void>('readwrite',(store,done)=>{store.put({...claim,userId});done()});legacyWrite(userId,next);return true}
 catch{try{localStorage.setItem(legacyKey(userId),JSON.stringify(next));return true}catch{return false}}
}
export async function acknowledgeXpClaim(userId:string,operationId:string):Promise<void>{
 // Never delete the recovery mirror before the durable IndexedDB transaction commits.
 try{await transact<void>('readwrite',(store,done)=>{store.delete(operationId);done()})}catch{return}
 const current=legacyRead(userId).filter(x=>x.operationId!==operationId);legacyWrite(userId,current)
}
