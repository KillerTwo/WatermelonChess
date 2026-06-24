import type { GameState } from './types'

export type GameHistory = GameState[]

export const createHistory = (): GameHistory => []

export const cloneState = (state: GameState): GameState => ({
  ...state,
  pieces: { ...state.pieces },
  captured: state.captured ? { ...state.captured } : undefined,
  lastMove: state.lastMove ? { ...state.lastMove } : undefined,
  result: { ...state.result },
})

export const pushSnapshot = (history: GameHistory, state: GameState): GameHistory => [
  ...history,
  cloneState(state),
]

export const restoreLatestSnapshot = (
  history: GameHistory,
): { state: GameState; history: GameHistory } | null => {
  if (history.length === 0) {
    return null
  }

  const nextHistory = history.slice(0, -1)
  const state = history[history.length - 1]

  return {
    state: cloneState(state),
    history: nextHistory,
  }
}
