/** MEWAY academic domain taxonomy. Topic names remain distinct from track names. */
export const learningTracks = ['Разговорный','Бизнес','Политика','Литературный'] as const
export type LearningTrack = typeof learningTracks[number]
export function learningTrack(item:{track?:string;title?:string;category?:string;description?:string;payload?:any}):LearningTrack {
  if (learningTracks.includes(item.track as LearningTrack)) return item.track as LearningTrack
  const text = `${item.title||''} ${item.category||''} ${item.description||''}`.toLocaleLowerCase()
  if (/полит|govern|democra|citizen|election|parliament|public policy|institutional|legislat|дипломат|граждан|policy analy|общественн|civic|rights|constitution|campaign|vote/.test(text)) return 'Политика'
  if (/business|workplace|professional|career|финанс|эконом|business|рынок|market|компан|делов|trade|commerce|entrepreneur|office|negotiat|budget|invoice|управлен|money|job|employment|продаж|corporate/.test(text)) return 'Бизнес'
  if (/литератур|literar|poetry|poem|novel|storytelling|narrative|rhetoric|metaphor|rhetoric|art|искусств|культур|creative|writing|философ|interpretation|criticism|автор|стил|language analysis|sophisticated writing|linguistic/.test(text)) return 'Литературный'
  return 'Разговорный'
}
export function learningTopic(item:{topic?:string;category?:string;title?:string}):string {
  if (item.topic?.trim()) return item.topic.trim()
  const category=String(item.category||'').trim()
  if (category && !/^(Словарный запас|Практика|Лексика и контекст|Точность и контекст)$/.test(category)) return category
  const title=String(item.title||'')
  const part=title.includes(':')?title.split(':').slice(1).join(':').trim():title.includes(' · ')?title.split(' · ')[1]?.trim():''
  return part?.replace(/ · (Vocabulary|Context) Mission$/,'')||'Лексика и контекст'
}
