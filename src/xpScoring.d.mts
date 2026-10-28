export function normalizeXpAnswer(value:unknown):string;
export function proportionalXp(maximum:number,correct:number,total:number):number;
export function gradeGameAnswers(item:any,submitted:unknown):{ok:true;correct:number;total:number}|{ok:false;error:string};
