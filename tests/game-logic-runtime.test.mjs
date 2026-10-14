import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizeGameAnswer,isCorrectOption,checkPuzzle,checkSentenceOrder} from '../src/gameLogic.mjs'
test('Russian and English answers compare consistently',()=>{
 assert.equal(normalizeGameAnswer('  APPLE   '),'apple')
 assert.equal(isCorrectOption('tomorrow','Tomorrow',['today','tomorrow']),true)
 assert.equal(isCorrectOption('tomorrow','1',['today','tomorrow']),true)
 assert.equal(isCorrectOption('today','1',['today','tomorrow']),false)
})
test('Puzzle checks every tile and identifies incorrect positions',()=>{
 assert.deepEqual(checkPuzzle([0,1,2,3]),{correct:true,wrongPositions:[]})
 assert.deepEqual(checkPuzzle([0,2,1,3]),{correct:false,wrongPositions:[1,2]})
})
test('Sentence order retains repeated words and ignores terminal punctuation',()=>{
 assert.equal(checkSentenceOrder(['I','think','I','can'], 'I think I can.'),true)
 assert.equal(checkSentenceOrder(['I','I','think','can'], 'I think I can.'),false)
})
