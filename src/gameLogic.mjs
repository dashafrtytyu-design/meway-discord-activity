/** Shared, local-only game answer checks. No network calls or persistence. */
export function normalizeGameAnswer(value){return String(value??'').trim().toLocaleLowerCase('en-GB').replace(/[’‘]/g,"'").replace(/\s+/g,' ')}
export function isCorrectOption(expected,chosen,options=[]){const actual=/^\d+$/.test(String(chosen))&&Number(chosen)<options.length?options[Number(chosen)]:chosen;return normalizeGameAnswer(expected)===normalizeGameAnswer(actual)}
export function checkPuzzle(tiles){const wrongPositions=tiles.flatMap((v,i)=>v===i?[]:[i]);return {correct:wrongPositions.length===0,wrongPositions}}
export function checkSentenceOrder(words,sentence){const clean=v=>normalizeGameAnswer(v).replace(/[.!?]+$/g,'');return clean(words.join(' '))===clean(sentence)}
