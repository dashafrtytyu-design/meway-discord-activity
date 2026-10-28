/** MEWAY verified XP scoring. Pure functions, shared by Worker tests. */
export function normalizeXpAnswer(value){return String(value??'').trim().toLocaleLowerCase('en-GB').replace(/[’‘]/g,"'").replace(/\s+/g,' ')}
export function proportionalXp(maximum,correct,total){
  const max=Math.max(0,Math.min(1000,Number(maximum)||0));
  const count=Math.max(0,Math.min(Number(total)||0,Number(correct)||0));
  return total>0?Math.round(max*count/total):0;
}
export function gradeGameAnswers(item,submitted){
  const gameType=String(item?.payload?.gameType||'word-match');
  const sourceWords=Array.isArray(item?.payload?.words)?item.payload.words:[];
  const words=gameType==='memory'?sourceWords.slice(0,20)
    :gameType==='crossword'?sourceWords.filter(w=>w?.en)
    :gameType==='drag-sort'?sourceWords.filter(w=>w?.en&&w?.category)
    :sourceWords.slice(0,100);
  const size=Math.max(2,Math.min(5,Number(item?.payload?.puzzleSize)||3));
  const total=gameType==='picture-puzzle'?size*size:words.length;
  if(!Array.isArray(submitted)||total<1||submitted.length!==total||submitted.some(v=>typeof v!=='string'||v.length>1000)){
    return {ok:false,error:'Complete answer transcript required for game XP.'};
  }
  const answers=Array.from({length:total},(_,i)=>{
    const w=words[i]||{};
    if(gameType==='picture-puzzle')return String(i);
    if(gameType==='crossword')return String(w.en||'').replace(/[^a-z]/gi,'');
    if(gameType==='category-sort'||gameType==='drag-sort')return String(w.category||w.correctAnswer||'');
    if(gameType==='sentence-order')return String(w.hint||w.example||w.en||'');
    if(gameType==='odd-one')return String(w.correctAnswer||item?.payload?.oddAnswer||w.en||'');
    if(gameType==='true-false'){
      if(['правда','ложь'].includes(normalizeXpAnswer(w.correctAnswer)))return String(w.correctAnswer);
      const statement=String(w.hint||w.example||`${w.ru} = ${w.en}`);
      return statement.toLowerCase().includes(String(w.en||'').toLowerCase())?'Правда':'Ложь';
    }
    return String(w.correctAnswer||w.en||'');
  });
  const correct=answers.filter((expected,i)=>Boolean(expected)&&normalizeXpAnswer(expected)===normalizeXpAnswer(submitted[i])).length;
  return {ok:true,correct,total};
}
