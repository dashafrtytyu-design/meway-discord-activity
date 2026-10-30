export const ROUTE_SECTIONS:readonly ['missions','quizzes','words','challenges','games']
export type LearningCatalogMath={missions:Array<{id:number;level:string}>;content:Array<{id:number;section:string;level:string}>}
export function calculateLearningRoute(catalog:LearningCatalogMath,completedMissions:number[],completedContent:number[],level:string|undefined):{
 stats:Record<'missions'|'quizzes'|'words'|'challenges'|'games',{count:number;total:number;percent:number}>;
 hasTasks:boolean;allDone:boolean
}
