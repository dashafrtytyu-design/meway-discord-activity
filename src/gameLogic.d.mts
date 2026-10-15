export function normalizeGameAnswer(value: unknown): string
export function isCorrectOption(answer: string, correct: unknown, options?: string[]): boolean
export function checkPuzzle(tiles: number[]): { correct: boolean; wrongPositions: number[] }
export function checkSentenceOrder(parts: string[], sentence: string): boolean
