/** Calendar metrics derived solely from server-confirmed local civil dates. */
export function civilDay(date){
 const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0')
 return `${y}-${m}-${d}`
}
export function consecutiveActivityDays(days,now=new Date()){
 const confirmed=new Set((days||[]).filter(x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)))
 const cursor=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12)
 if(!confirmed.has(civilDay(cursor)))cursor.setDate(cursor.getDate()-1)
 let streak=0
 while(confirmed.has(civilDay(cursor))){streak++;cursor.setDate(cursor.getDate()-1)}
 return streak
}
export function activityCalendarCell(key,confirmed,firstSeen,today){
 if(key>today||key<firstSeen)return 'unverified'
 return confirmed.includes(key)?'active':'missed'
}
