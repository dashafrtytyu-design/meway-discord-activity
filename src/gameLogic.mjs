/** Deterministic local checks. Never used as proof of server-authoritative XP. */
export function normalizeGameAnswer(value) {
  return String(value ?? '').trim().toLocaleLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ')
}
export function isCorrectOption(answer, correct, options = []) {
  const raw = String(correct ?? '').trim()
  const idx = Number(raw)
  const resolved = raw && !options.some(o => normalizeGameAnswer(o) === normalizeGameAnswer(raw)) && Number.isInteger(idx) && idx >= 0 && idx < options.length ? options[idx] : raw
  return normalizeGameAnswer(answer) === normalizeGameAnswer(resolved)
}
export function checkPuzzle(tiles) {
  return { correct: tiles.every((tile, position) => tile === position), wrongPositions: tiles.flatMap((tile, position) => tile === position ? [] : [position]) }
}
export function checkSentenceOrder(parts, sentence) {
  return normalizeGameAnswer(parts.join(' ').replace(/[.!?]/g, '')) === normalizeGameAnswer(String(sentence).replace(/[.!?]/g, ''))
}
