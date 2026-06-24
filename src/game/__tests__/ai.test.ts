import { describe, expect, it } from 'vitest'
import {
  chooseAiMove,
  createInitialState,
  generateLegalMoves,
  isMoveLegal,
} from '..'
import type { AiDifficulty, GameState } from '..'

const expectLegalAiMove = (state: GameState, difficulty: AiDifficulty) => {
  const move = chooseAiMove(state, { difficulty })

  expect(move).not.toBeNull()
  expect(isMoveLegal(state, move!)).toBe(true)
}

describe('ai strategies', () => {
  it('easy ai returns a legal move', () => {
    const state: GameState = {
      ...createInitialState(),
      currentPlayer: 'black',
      result: { type: 'active', currentPlayer: 'black' },
    }

    expectLegalAiMove(state, 'easy')
  })

  it('medium ai returns a legal move', () => {
    const state: GameState = {
      ...createInitialState(),
      currentPlayer: 'black',
      result: { type: 'active', currentPlayer: 'black' },
    }

    expectLegalAiMove(state, 'medium')
  })

  it('hard ai returns a legal move', () => {
    const state: GameState = {
      ...createInitialState(),
      currentPlayer: 'black',
      result: { type: 'active', currentPlayer: 'black' },
    }

    expectLegalAiMove(state, 'hard')
  })

  it('returns null when no legal move exists', () => {
    const state: GameState = {
      pieces: {
        CENTER: 'black',
        V_INNER_TOP: 'red',
        V_INNER_BOTTOM: 'red',
        H_INNER_LEFT: 'red',
        H_INNER_RIGHT: 'red',
      },
      currentPlayer: 'black',
      result: { type: 'active', currentPlayer: 'black' },
      moveCount: 0,
      captured: { red: 4, black: 5 },
    }

    expect(generateLegalMoves(state, 'black')).toEqual([])
    expect(chooseAiMove(state, { difficulty: 'hard' })).toBeNull()
  })
})
