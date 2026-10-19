import {acknowledgeXpClaim,listXpClaims,type XpClaim} from './xpOutbox'

/** Process one snapshot. Permanent claim errors are retained but do not block
 * other claims; transient errors stop the batch to avoid unnecessary requests. */
export async function processXpQueue(options:{
 userId:string
 fetchClaim:(claim:XpClaim)=>Promise<Response>
 onConfirmed:(result:{progress:any})=>void
 onRejected?:(claim:XpClaim,status:number,reason:string)=>void
 list?:(userId:string)=>Promise<XpClaim[]>
 acknowledge?:(userId:string,operationId:string)=>Promise<void>
}):Promise<void>{
 const list=options.list||listXpClaims
 const acknowledge=options.acknowledge||acknowledgeXpClaim
 const claims=await list(options.userId)
 for(const claim of claims){
   let response:Response
   try{response=await options.fetchClaim(claim)}catch{break}
   if(!response.ok){
     if(response.status===404||response.status===422){
       const detail=await response.json().catch(()=>null) as {error?:string}|null
       options.onRejected?.(claim,response.status,String(detail?.error||'Claim rejected').slice(0,180))
       continue
     }
     break
   }
   let result:any
   try{result=await response.json()}catch{break}
   if(!result?.ok||!result?.progress)break
   options.onConfirmed(result)
   await acknowledge(options.userId,claim.operationId)
 }
}
