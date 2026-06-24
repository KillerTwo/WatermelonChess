import { ADJACENCY, getNeighbors } from './board'
import {
  type ApplyMoveResult,
  type GameResult,
  type GameState,
  InvalidMoveError,
  type Move,
  type PieceMap,
  type Player,
  type PointId,
  opponentOf,
} from './types'

const sortPoints = (points: PointId[]): PointId[] => [...points].sort()

export const countPieces = (state: Pick<GameState, 'pieces'>, player: Player): number =>
  Object.values(state.pieces).filter((piece) => piece === player).length

export const isAdjacent = (from: PointId, to: PointId): boolean => ADJACENCY[from].includes(to)

export const getLegalTargets = (state: GameState, from: PointId): PointId[] => {
  const player = state.pieces[from]

  if (!player || player !== state.currentPlayer || state.result.type !== 'active') {
    return []
  }

  return getNeighbors(from).filter((point) => !state.pieces[point])
}

export const generateLegalMoves = (state: GameState, player: Player = state.currentPlayer): Move[] => {
  if (state.result.type !== 'active' || state.currentPlayer !== player) {
    return []
  }

  return (Object.entries(state.pieces) as Array<[PointId, Player]>).flatMap(([from, piece]) => {
    if (piece !== player) {
      return []
    }

    return getLegalTargets(state, from).map((to) => ({ from, to, player }))
  })
}

export const validateMove = (state: GameState, move: Move): void => {
  if (state.result.type !== 'active') {
    throw new InvalidMoveError('Cannot move after the game has ended.')
  }

  if (move.player !== state.currentPlayer) {
    throw new InvalidMoveError('Move player must match the current player.')
  }

  if (state.pieces[move.from] !== move.player) {
    throw new InvalidMoveError('Move must start from a point occupied by the current player.')
  }

  if (state.pieces[move.to]) {
    throw new InvalidMoveError('Move target must be empty.')
  }

  if (!isAdjacent(move.from, move.to)) {
    throw new InvalidMoveError('Move target must be adjacent.')
  }
}

export const isMoveLegal = (state: GameState, move: Move): boolean => {
  try {
    validateMove(state, move)
    return true
  } catch (error) {
    if (error instanceof InvalidMoveError) {
      return false
    }

    throw error
  }
}

export const findConnectedGroups = (pieces: PieceMap, player: Player): PointId[][] => {
  const visited = new Set<PointId>()
  const groups: PointId[][] = []

  for (const [point, piece] of Object.entries(pieces) as Array<[PointId, Player]>) {
    if (piece !== player || visited.has(point)) {
      continue
    }

    const group: PointId[] = []
    const stack: PointId[] = [point]
    visited.add(point)

    while (stack.length > 0) {
      const current = stack.pop() as PointId
      group.push(current)

      for (const neighbor of getNeighbors(current)) {
        if (pieces[neighbor] === player && !visited.has(neighbor)) {
          visited.add(neighbor)
          stack.push(neighbor)
        }
      }
    }

    groups.push(sortPoints(group))
  }

  return groups.sort((left, right) => left[0].localeCompare(right[0]))
}

const groupHasLiberty = (pieces: PieceMap, group: PointId[]): boolean =>
  group.some((point) => getNeighbors(point).some((neighbor) => !pieces[neighbor]))

const captureOpponentGroups = (pieces: PieceMap, opponent: Player): PointId[] => {
  const captured: PointId[] = []

  for (const group of findConnectedGroups(pieces, opponent)) {
    if (!groupHasLiberty(pieces, group)) {
      captured.push(...group)
    }
  }

  for (const point of captured) {
    delete pieces[point]
  }

  return sortPoints(captured)
}

const resolveResult = (pieces: PieceMap, nextPlayer: Player): GameResult => {
  const redCount = Object.values(pieces).filter((piece) => piece === 'red').length
  const blackCount = Object.values(pieces).filter((piece) => piece === 'black').length

  if (redCount <= 2 && blackCount <= 2) {
    return { type: 'draw' }
  }

  if (redCount <= 2) {
    return { type: 'win', winner: 'black' }
  }

  if (blackCount <= 2) {
    return { type: 'win', winner: 'red' }
  }

  return { type: 'active', currentPlayer: nextPlayer }
}

export const applyMove = (state: GameState, move: Move): ApplyMoveResult => {
  validateMove(state, move)

  const pieces: PieceMap = { ...state.pieces }
  delete pieces[move.from]
  pieces[move.to] = move.player

  const opponent = opponentOf(move.player)
  const capturedPoints = captureOpponentGroups(pieces, opponent)
  const nextPlayer = opponent
  const result = resolveResult(pieces, nextPlayer)
  const captured = {
    red: state.captured?.red ?? 0,
    black: state.captured?.black ?? 0,
  }
  captured[opponent] += capturedPoints.length

  return {
    capturedPoints,
    state: {
      pieces,
      currentPlayer: result.type === 'active' ? result.currentPlayer : nextPlayer,
      result,
      moveCount: state.moveCount + 1,
      lastMove: move,
      captured,
    },
  }
}
