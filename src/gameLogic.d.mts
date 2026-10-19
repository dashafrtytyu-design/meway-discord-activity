export function normalizeGameAnswer(value:unknown):string
export function isCorrectOption(expected:unknown,chosen:unknown,options?:string[]):boolean
export function checkPuzzle(tiles:number[]):{correct:boolean;wrongPositions:number[]}
export function checkSentenceOrder(words:string[],sentence:string):boolean
