import {acknowledgeXpClaim,listXpClaims,type XpClaim} from './xpOutbox'

/** Process one snapshot. Permanent claim errors are retained but do not block
 * other claims; transient errors stop the batch to avoid unnecessary requests. */
export async function processXpQueue(options:{
 userId:string
 fetchClaim:(claim:XpClaim)=>Promise<Response>
 onConfirmed:(result:{progress:any;awardedXp?:number;alreadyCompleted?:boolean})=>void
 onRejected?:(claim:XpClaim,status:number,reason:string)=>void
 list?:(userId:string)=>Promise<XpClaim[]>
 acknowledge?:(userId:string,operationId:string)=>Promise<void>
}):Promise<void>{
 const list=options.list||listXpClaims
 const acknowledge=options.acknowledge||acknowledgeXpClaim
 const claims=await list(options.userId)
 // A newly completed mission/quiz/challenge is sent first. Old claims stay durable
 // and can be retried afterwards, without holding up the visible XP confirmation.
 const ordered=[...claims].sort((a,b)=>(Number(b.createdAt)||0)-(Number(a.createdAt)||0))
 for(const claim of ordered){
   let response:Response
   try{response=await options.fetchClaim(claim)}catch{options.onRejected?.(claim,0,'Connection interrupted; the XP claim stays queued.');break}
   if(!response.ok){
     const detail=await response.json().catch(()=>null) as {error?:string}|null
     options.onRejected?.(claim,response.status,String(detail?.error||'Claim rejected').slice(0,180))
     // Invalid old claims cannot block newer activities. Every failed claim stays queued.
     if(response.status===404||response.status===422||response.status===403)continue
     break
   }
   let result:any
   try{result=await response.json()}catch{options.onRejected?.(claim,response.status,'Server response could not be read. XP claim is still queued.');break}
   if(!result?.ok||!result?.progress){options.onRejected?.(claim,response.status,'Server did not confirm XP; claim stays queued.');break}
   options.onConfirmed(result)
   await acknowledge(options.userId,claim.operationId)
 }
}
