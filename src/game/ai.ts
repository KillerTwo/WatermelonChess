import { applyMove, countPieces, generateLegalMoves } from './rules'
import type { AiDifficulty, GameState, Move, MoveScore, Player } from './types'
import { opponentOf } from './types'

export interface AiOptions {
  difficulty: AiDifficulty
  maxDepth?: number
}

const terminalScore = (state: GameState, player: Player): number | null => {
  if (state.result.type === 'draw') {
    return 0
  }

  if (state.result.type === 'win') {
    return state.result.winner === player ? 10000 : -10000
  }

  return null
}

const evaluateState = (state: GameState, player: Player): number => {
  const terminal = terminalScore(state, player)

  if (terminal !== null) {
    return terminal
  }

  const opponent = opponentOf(player)
  const playerMoves = state.currentPlayer === player ? generateLegalMoves(state, player).length : 0
  const opponentState: GameState = {
    ...state,
    currentPlayer: opponent,
    result: { type: 'active', currentPlayer: opponent },
  }
  const opponentMoves = generateLegalMoves(opponentState, opponent).length
  const pieceScore = (countPieces(state, player) - countPieces(state, opponent)) * 100
  const mobilityScore = (playerMoves - opponentMoves) * 6

  return pieceScore + mobilityScore
}

const scoreMove = (state: GameState, move: Move, aiPlayer: Player): MoveScore => {
  const result = applyMove(state, move)
  const capturedScore = result.capturedPoints.length * 250
  const replyCount = generateLegalMoves(result.state, result.state.currentPlayer).length

  return {
    move,
    score: capturedScore + evaluateState(result.state, aiPlayer) - replyCount,
  }
}

const pickBestByScore = (state: GameState, aiPlayer: Player): Move | null => {
  const moves = generateLegalMoves(state, aiPlayer)

  if (moves.length === 0) {
    return null
  }

  return moves
    .map((move) => scoreMove(state, move, aiPlayer))
    .sort((left, right) => right.score - left.score)[0].move
}

const minimax = (
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  aiPlayer: Player,
): number => {
  const terminal = terminalScore(state, aiPlayer)

  if (terminal !== null || depth === 0) {
    return evaluateState(state, aiPlayer)
  }

  const moves = generateLegalMoves(state, state.currentPlayer)

  if (moves.length === 0) {
    return evaluateState(state, aiPlayer)
  }

  if (state.currentPlayer === aiPlayer) {
    let best = Number.NEGATIVE_INFINITY

    for (const move of moves) {
      best = Math.max(best, minimax(applyMove(state, move).state, depth - 1, alpha, beta, aiPlayer))
      alpha = Math.max(alpha, best)

      if (beta <= alpha) {
        break
      }
    }

    return best
  }

  let best = Number.POSITIVE_INFINITY

  for (const move of moves) {
    best = Math.min(best, minimax(applyMove(state, move).state, depth - 1, alpha, beta, aiPlayer))
    beta = Math.min(beta, best)

    if (beta <= alpha) {
      break
    }
  }

  return best
}

const pickHardMove = (state: GameState, aiPlayer: Player, depth: number): Move | null => {
  const moves = generateLegalMoves(state, aiPlayer)

  if (moves.length === 0) {
    return null
  }

  return moves
    .map((move) => ({
      move,
      score: minimax(
        applyMove(state, move).state,
        depth - 1,
        Number.NEGATIVE_INFINITY,
        Number.POSITIVE_INFINITY,
        aiPlayer,
      ),
    }))
    .sort((left, right) => right.score - left.score)[0].move
}

export const chooseAiMove = (state: GameState, options: AiOptions): Move | null => {
  const aiPlayer = state.currentPlayer
  const moves = generateLegalMoves(state, aiPlayer)

  if (moves.length === 0) {
    return null
  }

  if (options.difficulty === 'easy') {
    return moves[Math.floor(Math.random() * moves.length)]
  }

  if (options.difficulty === 'medium') {
    return pickBestByScore(state, aiPlayer)
  }

  return pickHardMove(state, aiPlayer, options.maxDepth ?? 4)
}
