export type PerformanceMode='auto'|'full'|'eco'
export type HomeWidget='continue'|'goal'|'xp'|'streak'|'review'|'recent'|'calendar'
export type LocalNotice={id:string;text:string;at:number;read?:boolean}
export type StudyItem={id:string;title:string;kind:string;at:number}
const j=<T>(k:string,d:T):T=>{try{return JSON.parse(localStorage.getItem(k)||'null')??d}catch{return d}}
const s=(k:string,v:unknown)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
export const ux={
 getHome:()=>j<HomeWidget[]>('meway-home-widgets',['continue','goal','xp','streak','review','recent','calendar']),setHome:(v:HomeWidget[])=>s('meway-home-widgets',v),
 notices:()=>j<LocalNotice[]>('meway-notices',[]),addNotice:(text:string)=>{const a=j<LocalNotice[]>('meway-notices',[]);if(a[0]?.text===text)return;s('meway-notices',[{id:String(Date.now()),text,at:Date.now()},...a].slice(0,60))},setNotices:(v:LocalNotice[])=>s('meway-notices',v),
 queue:()=>j<StudyItem[]>('meway-study-queue',[]),setQueue:(v:StudyItem[])=>s('meway-study-queue',v.slice(0,50)),
 recent:()=>j<StudyItem[]>('meway-recent',[]),touchRecent:(title:string,kind:string)=>{const a=j<StudyItem[]>('meway-recent',[]).filter(x=>x.title!==title);s('meway-recent',[{id:`${kind}:${title}`,title,kind,at:Date.now()},...a].slice(0,20))},
 session:()=>j<any>('meway-session-restore',null),saveSession:(v:any)=>s('meway-session-restore',{...v,at:Date.now()}),clearSession:()=>localStorage.removeItem('meway-session-restore'),
 escalationSeen:(q:string)=>{const k='meway-escalation-seen',m=j<Record<string,number>>(k,{}),n=q.toLowerCase().replace(/[^a-zа-я0-9]+/gi,' ').trim(),now=Date.now();return Boolean(m[n]&&now-m[n]<86400000)},
 markEscalation:(q:string)=>{const k='meway-escalation-seen',m=j<Record<string,number>>(k,{}),n=q.toLowerCase().replace(/[^a-zа-я0-9]+/gi,' ').trim();if(n){m[n]=Date.now();s(k,m)}},
 cacheBytes:()=>{let n=0;try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||'';n+=k.length+(localStorage.getItem(k)||'').length}}catch{}return n*2},
 clearLocalUX:()=>['meway-notices','meway-study-queue','meway-recent','meway-session-restore','meway-escalation-seen'].forEach(k=>localStorage.removeItem(k))
}
export const pageSearch=[['Главная','Dashboard, Home, продолжить'],['Placement Test','уровень, тест'],['Миссии','missions, задания'],['Игры','games'],['Квизы','quiz, тесты'],['Слова','vocabulary, words, airport'],['Челленджи','challenge'],['Награды','achievements, достижения'],['Рейтинг','leaderboard'],['Мой план','focus, календарь, заметки'],['Ассистент','assistant, помощь'],['Профиль','settings, настройки']] as const
