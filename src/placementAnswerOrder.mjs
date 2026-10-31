/**
 * Create a fresh, local-only answer order for each 50-question section.
 * Every answer position occurs either 12 or 13 times per section;
 * no two adjacent questions have the same correct-answer button.
 * This does not change question IDs or the server's answer-key checking.
 * @param {Array<{options:string[],answer:string,domain:string}>} questions
 * @returns {string[][]}
 */
export function makePlacementAnswerOrder(questions){
  const output=[]
  let last=-1
  let at=0
  while(at<questions.length){
    const domain=questions[at].domain
    let end=at+1
    while(end<questions.length&&questions[end].domain===domain)end++
    const count=end-at
    const positions=[]
    // Twelve shuffled rounds of 4, then two extra distinct slots for 50 items.
    // Every round contains every possible position exactly once.
    while(positions.length<count){
      const round=[0,1,2,3]
      for(let k=round.length-1;k>0;k--){const swap=Math.floor(Math.random()*(k+1));[round[k],round[swap]]=[round[swap],round[k]]}
      const previous=positions.length?positions[positions.length-1]:last
      if(round[0]===previous){
        const swap=1+Math.floor(Math.random()*3)
        ;[round[0],round[swap]]=[round[swap],round[0]]
      }
      const available=Math.min(4,count-positions.length)
      positions.push(...round.slice(0,available))
    }
    for(let j=at;j<end;j++){
      const position=positions[j-at]
      const item=questions[j]
      const wrong=item.options.filter(option=>option!==item.answer)
      for(let k=wrong.length-1;k>0;k--){const swap=Math.floor(Math.random()*(k+1));[wrong[k],wrong[swap]]=[wrong[swap],wrong[k]]}
      wrong.splice(position,0,item.answer)
      output.push(wrong)
      last=position
    }
    at=end
  }
  return output
}
