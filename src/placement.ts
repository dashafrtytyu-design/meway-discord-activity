import {placementBank} from './placementBank'

export type PlacementLevel='A1'|'A2'|'B1'|'B2'|'C1'|'C2'
export type PlacementDomain='Grammar'|'Vocabulary'
export type PlacementQuestion={id:number;level:PlacementLevel;domain:PlacementDomain;topic:string;q:string;options:string[];answer:string;shuffleAnswers?:boolean}
export const PLACEMENT_LEVELS:PlacementLevel[]=['A1','A2','B1','B2','C1','C2']
export const PLACEMENT_VARIANT_COUNT=5
export const PLACEMENT_ITEMS_PER_DOMAIN=50
export const PLACEMENT_ITEMS_PER_FORM=100
// Retakes advance to the next form as soon as the previous result is saved.
export const PLACEMENT_RETAKE_DAYS=0
export const placementVariants:Record<number,PlacementQuestion[]>=placementBank
export const placementQuestions=placementBank[1]
export type PlacementCount={correct:number;total:number;percent:number}
export type PlacementDomainResult=PlacementCount&{level:PlacementLevel;breakdown:Record<PlacementLevel,PlacementCount>}
export type PlacementAnswerReview={id:number;level:PlacementLevel;domain:PlacementDomain;topic:string;question:string;answer:string;correctAnswer:string;correct:boolean}
export type PlacementResult={
 level:PlacementLevel;score:number;total:number;percent:number;
 breakdown:Record<PlacementLevel,PlacementCount>;
 domainBreakdown:Record<PlacementDomain,PlacementDomainResult>;
 weakTopics:Array<PlacementCount&{topic:string;domain:PlacementDomain}>;
 mistakes:PlacementAnswerReview[];
 review:PlacementAnswerReview[];
 recommendation:string;completedAt:string
}
const pct=(correct:number,total:number)=>total?Math.round(correct*100/total):0
function countByLevel(questions:PlacementQuestion[],answers:Record<number,string>):Record<PlacementLevel,PlacementCount>{
 const result={} as Record<PlacementLevel,PlacementCount>
 for(const level of PLACEMENT_LEVELS){const qs=questions.filter(q=>q.level===level);const correct=qs.filter(q=>answers[q.id]===q.answer).length;result[level]={correct,total:qs.length,percent:pct(correct,qs.length)}}
 return result
}
// Diagnostic CEFR estimate, NOT standardised or psychometrically calibrated.
// Evaluate the evidence at each band rather than downgrading a learner for a
// single lower-band mistake. The pooled overall profile can exceed a domain's
// band when the other domain supplies strong evidence at that band.
// Never award an advanced band without adequate performance on its own items.
export function estimatePlacementLevel(breakdown:Record<PlacementLevel,PlacementCount>):PlacementLevel{
 let result:PlacementLevel='A1'
 for(const [index,level] of PLACEMENT_LEVELS.entries()){
  const item=breakdown[level]
  if(!item?.total||item.correct/item.total<0.65)continue
  const below=PLACEMENT_LEVELS.slice(0,index).map(b=>breakdown[b])
  if(below.some(stat=>!stat?.total||stat.correct/stat.total<0.45))continue
  const lowerTotal=below.reduce((sum,stat)=>sum+stat.total,0)
  const lowerCorrect=below.reduce((sum,stat)=>sum+stat.correct,0)
  if(lowerTotal>0&&lowerCorrect/lowerTotal<0.70)continue
  result=level
 }
 return result
}
export function evaluatePlacement(questions:PlacementQuestion[],answers:Record<number,string>):PlacementResult{
 const score=questions.filter(q=>answers[q.id]===q.answer).length
 const breakdown=countByLevel(questions,answers)
 const domainBreakdown={} as Record<PlacementDomain,PlacementDomainResult>
 for(const domain of ['Grammar','Vocabulary'] as const){
  const subset=questions.filter(q=>q.domain===domain)
  const correct=subset.filter(q=>answers[q.id]===q.answer).length
  const byLevel=countByLevel(subset,answers)
  domainBreakdown[domain]={correct,total:subset.length,percent:pct(correct,subset.length),level:estimatePlacementLevel(byLevel),breakdown:byLevel}
 }
 const topics=new Map<string,PlacementCount&{topic:string;domain:PlacementDomain}>()
 for(const q of questions){
  const key=q.domain+'\u0000'+q.topic
  const stat=topics.get(key)||{domain:q.domain,topic:q.topic,correct:0,total:0,percent:0}
  stat.total++
  if(answers[q.id]===q.answer)stat.correct++
  topics.set(key,stat)
 }
 const weakTopics=[...topics.values()].map(x=>({...x,percent:pct(x.correct,x.total)})).filter(x=>x.correct<x.total)
  .sort((a,b)=>(b.total-b.correct)-(a.total-a.correct)||a.percent-b.percent||a.topic.localeCompare(b.topic))
 const review:PlacementAnswerReview[]=questions.map(q=>({id:q.id,level:q.level,domain:q.domain,topic:q.topic,question:q.q,answer:answers[q.id]||'—',correctAnswer:q.answer,correct:answers[q.id]===q.answer}))
 const mistakes=review.filter(item=>!item.correct)
 const level=estimatePlacementLevel(breakdown)
 const grammar=domainBreakdown.Grammar,vocabulary=domainBreakdown.Vocabulary
 const weakest=grammar.percent<=vocabulary.percent?'Grammar':'Vocabulary'
 const sectionAdvice=weakest==='Grammar'
  ?'Начни с грамматических уроков MEWAY и повтори конструкции, в которых ошибся.'
  :'Начни со словаря и разговорных фраз MEWAY, затем закрепляй их в коротких текстах и диалогах.'
 const recommendation=`Grammar: ${grammar.correct}/50 (${grammar.percent}%), ориентир ${grammar.level}. Vocabulary: ${vocabulary.correct}/50 (${vocabulary.percent}%), ориентир ${vocabulary.level}. ${sectionAdvice} Результат основан на ответах в этом тесте.`
 return {level,score,total:questions.length,percent:pct(score,questions.length),breakdown,domainBreakdown,weakTopics,mistakes,review,recommendation,completedAt:new Date().toISOString()}
}
// Stable pseudo-random choice for the sixth and later tests: the client GET and
// server POST always agree; no previous form immediately repeats after form 5.
export function nextPlacementVariant(last:{attempt?:number;variant?:number;completedAt?:string}|null,userId=''):number{
 const attempts=Math.max(0,Math.floor(Number(last?.attempt)||0))
 if(attempts<5)return attempts+1
 const previous=Math.max(1,Math.min(5,Math.floor(Number(last?.variant)||5)))
 const pool=[1,2,3,4,5].filter(v=>v!==previous)
 const seed=`${userId}:${last?.completedAt||''}:${attempts}:${previous}`
 let hash=2166136261
 for(const char of seed)hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0
 return pool[hash%pool.length]
}
export function validatePlacementForm(questions:unknown):questions is PlacementQuestion[]{
 if(!Array.isArray(questions)||questions.length!==PLACEMENT_ITEMS_PER_FORM)return false
 if(questions.slice(0,50).some(q=>q?.domain!=='Grammar')||questions.slice(50).some(q=>q?.domain!=='Vocabulary'))return false
 if(new Set(questions.map(q=>q.id)).size!==100)return false
 for(const q of questions){
  if(!q||!Number.isSafeInteger(q.id)||!PLACEMENT_LEVELS.includes(q.level)||!['Grammar','Vocabulary'].includes(q.domain))return false
  if(typeof q.q!=='string'||!q.q.trim()||q.q.length>800||typeof q.topic!=='string'||!q.topic.trim()||q.topic.length>90)return false
  if(!Array.isArray(q.options)||q.options.length!==4||q.options.some((x:unknown)=>typeof x!=='string'||!x.trim()||(x as string).length>300))return false
  if(new Set(q.options).size!==4||!q.options.includes(q.answer))return false
 }
 for(const domain of ['Grammar','Vocabulary']){
  const counts=PLACEMENT_LEVELS.map(level=>questions.filter(q=>q.domain===domain&&q.level===level).length)
  // Enough evidence in every CEFR band for each separate section.
  if(counts.some(n=>n<6))return false
 }
 return true
}
