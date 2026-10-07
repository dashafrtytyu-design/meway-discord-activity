// MEWAY protected persistent curriculum cache.
// This cache is automatic and belongs to the MEWAY Activity. Users never need to manage it.
// If browser/site storage is cleared, MEWAY safely rebuilds the cache on the next launch.
const DB_NAME='meway-curriculum-cache-v2', STORE='kv', DB_VERSION=1
const KEY_NAME='meway-device-cache-key-v1'
const NOTICE_KEY='__MEWAY_NOTICE__'
const NOTICE='MEWAY local curriculum cache. Do not delete: clearing it only makes MEWAY download the learning material again on the next launch.'
export type CachedEnvelope<T>={data:T;revision:string;appVersion:string;savedAt:number}
type CipherRecord={v:1;iv:string;cipher:string}
function openDb():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function b64(bytes:Uint8Array){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s)}
function unb64(s:string){const raw=atob(s),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
async function deviceKey(){let raw=localStorage.getItem(KEY_NAME);if(!raw){const b=crypto.getRandomValues(new Uint8Array(32));raw=b64(b);localStorage.setItem(KEY_NAME,raw)}return crypto.subtle.importKey('raw',unb64(raw),{name:'AES-GCM'},false,['encrypt','decrypt'])}
async function encrypt(value:unknown):Promise<CipherRecord>{const key=await deviceKey(),iv=crypto.getRandomValues(new Uint8Array(12)),plain=new TextEncoder().encode(JSON.stringify(value)),cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,plain);return {v:1,iv:b64(iv),cipher:b64(new Uint8Array(cipher))}}
async function decrypt<T>(value:any):Promise<T|null>{try{if(!value||value.v!==1)return null;const key=await deviceKey(),plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(value.iv)},key,unb64(value.cipher));return JSON.parse(new TextDecoder().decode(plain)) as T}catch{return null}}
async function putRaw(key:string,value:any){const db=await openDb();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value,key);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)})}
async function ensureNotice(){try{await putRaw(NOTICE_KEY,{owner:'MEWAY',notice:NOTICE,managedAutomatically:true})}catch{}}
export async function cacheGet<T>(key:string):Promise<CachedEnvelope<T>|null>{try{const db=await openDb();const raw=await new Promise<any>((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);tx.oncomplete=()=>db.close()});void ensureNotice();return await decrypt<CachedEnvelope<T>>(raw)}catch{return null}}
export async function cacheSet<T>(key:string,value:CachedEnvelope<T>):Promise<void>{try{await putRaw(key,await encrypt(value));void ensureNotice()}catch{}}
export async function cacheDelete(key:string):Promise<void>{try{const db=await openDb();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(key);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)})}catch{}}
