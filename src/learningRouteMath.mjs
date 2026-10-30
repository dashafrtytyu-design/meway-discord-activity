/** Only confirmed completions count. Duplicates never inflate a course score. */
export const ROUTE_SECTIONS = ['missions','quizzes','words','challenges','games']
export function calculateLearningRoute(catalog,completedMissions,completedContent,level){
 const missionDone=new Set(completedMissions||[]), contentDone=new Set(completedContent||[])
 const stats={}
 for(const section of ROUTE_SECTIONS){
   const rows=section==='missions'?(catalog?.missions||[]):(catalog?.content||[]).filter(x=>x.section===section)
   const ids=new Set(rows.filter(x=>x.level===level).map(x=>Number(x.id)).filter(Number.isFinite))
   const done=section==='missions'?missionDone:contentDone
   const count=[...ids].filter(id=>done.has(id)).length
   const total=ids.size
   const percent=total===0?0:count===total?100:Math.min(99.9,Math.floor(count/total*1000)/10)
   stats[section]={count,total,percent}
 }
 const hasTasks=ROUTE_SECTIONS.some(s=>stats[s].total>0)
 const allDone=hasTasks&&ROUTE_SECTIONS.every(s=>stats[s].total>0&&stats[s].count===stats[s].total)
 return {stats,hasTasks,allDone}
}
