import { describe, expect, it } from 'vitest'
import {
  ADJACENCY,
  BLACK_START_POINTS,
  POINTS,
  RED_START_POINTS,
  applyMove,
  countPieces,
  createInitialState,
  findConnectedGroups,
  generateLegalMoves,
  getNeighbors,
  getLegalTargets,
  validateMove,
} from '..'
import type { GameState, PointId } from '..'

describe('watermelon board model', () => {
  it('has 21 unique points', () => {
    const ids = POINTS.map((point) => point.id)

    expect(ids).toHaveLength(21)
    expect(new Set(ids).size).toBe(21)
  })

  it('has symmetric adjacency', () => {
    for (const [point, neighbors] of Object.entries(ADJACENCY) as Array<[PointId, PointId[]]>) {
      for (const neighbor of neighbors) {
        expect(ADJACENCY[neighbor]).toContain(point)
      }
    }
  })

  it('creates the confirmed initial position', () => {
    const state = createInitialState()

    expect(RED_START_POINTS).toEqual(['O_S', 'O_SW1', 'O_SW2', 'O_SE1', 'O_SE2', 'V_BOTTOM_ARC'])
    expect(BLACK_START_POINTS).toEqual(['O_N', 'O_NW1', 'O_NW2', 'O_NE1', 'O_NE2', 'V_TOP_ARC'])

    for (const point of RED_START_POINTS) {
      expect(state.pieces[point]).toBe('red')
    }

    for (const point of BLACK_START_POINTS) {
      expect(state.pieces[point]).toBe('black')
    }

    expect(Object.values(state.pieces).filter((piece) => piece === 'red')).toHaveLength(6)
    expect(Object.values(state.pieces).filter((piece) => piece === 'black')).toHaveLength(6)
    expect(state.currentPlayer).toBe('red')
    expect(state.result).toEqual({ type: 'active', currentPlayer: 'red' })
  })

  it('returns neighbors for a point without exposing mutable adjacency', () => {
    const neighbors = getNeighbors('CENTER')

    expect(neighbors).toEqual(['V_INNER_TOP', 'V_INNER_BOTTOM', 'H_INNER_LEFT', 'H_INNER_RIGHT'])
    neighbors.push('O_N')
    expect(getNeighbors('CENTER')).toEqual(['V_INNER_TOP', 'V_INNER_BOTTOM', 'H_INNER_LEFT', 'H_INNER_RIGHT'])
  })
})

describe('watermelon rules engine', () => {
  it('generates only adjacent empty legal targets', () => {
    const state = createInitialState()

    expect(getLegalTargets(state, 'O_S')).toEqual([])
    expect(getLegalTargets(state, 'V_BOTTOM_ARC')).toEqual(['V_INNER_BOTTOM'])
    expect(generateLegalMoves(state, 'red')).toContainEqual({
      from: 'V_BOTTOM_ARC',
      to: 'V_INNER_BOTTOM',
      player: 'red',
    })
  })

  it('rejects jumps and occupied targets', () => {
    const state = createInitialState()

    expect(() => validateMove(state, { from: 'O_S', to: 'CENTER', player: 'red' })).toThrow('adjacent')
    expect(() => validateMove(state, { from: 'O_S', to: 'O_SW1', player: 'red' })).toThrow('empty')
  })

  it('finds connected groups by player', () => {
    const state: GameState = {
      ...createInitialState(),
      pieces: {
        O_S: 'red',
        O_SW1: 'red',
        O_N: 'black',
        O_E: 'black',
      },
    }

    const redGroups = findConnectedGroups(state.pieces, 'red')
    const blackGroups = findConnectedGroups(state.pieces, 'black')

    expect(redGroups).toEqual([['O_S', 'O_SW1']])
    expect(blackGroups).toEqual([['O_E'], ['O_N']])
  })

  it('captures a single trapped opponent group after moving', () => {
    const state: GameState = {
      pieces: {
        O_N: 'black',
        O_NE1: 'red',
        O_NW1: 'red',
        V_INNER_TOP: 'red',
        CENTER: 'red',
        O_S: 'red',
      },
      currentPlayer: 'red',
      result: { type: 'active', currentPlayer: 'red' },
      moveCount: 0,
      captured: { red: 0, black: 0 },
    }

    const result = applyMove(state, { from: 'V_INNER_TOP', to: 'V_TOP_ARC', player: 'red' })

    expect(result.capturedPoints).toEqual(['O_N'])
    expect(result.state.pieces.O_N).toBeUndefined()
    expect(result.state.captured).toEqual({ red: 0, black: 1 })
  })

  it('captures multiple trapped opponent groups in one move', () => {
    const state: GameState = {
      pieces: {
        O_N: 'black',
        O_S: 'black',
        O_NE1: 'red',
        O_NW1: 'red',
        V_TOP_ARC: 'red',
        V_INNER_TOP: 'red',
        O_SE1: 'red',
        O_SW1: 'red',
        V_BOTTOM_ARC: 'red',
        V_INNER_BOTTOM: 'red',
        H_INNER_LEFT: 'red',
      },
      currentPlayer: 'red',
      result: { type: 'active', currentPlayer: 'red' },
      moveCount: 0,
      captured: { red: 0, black: 0 },
    }

    const result = applyMove(state, { from: 'H_INNER_LEFT', to: 'CENTER', player: 'red' })

    expect(result.capturedPoints.sort()).toEqual(['O_N', 'O_S'])
    expect(result.state.pieces.O_N).toBeUndefined()
    expect(result.state.pieces.O_S).toBeUndefined()
    expect(result.state.captured).toEqual({ red: 0, black: 2 })
  })

  it('allows surrounded moves without checking own group for capture', () => {
    const state: GameState = {
      pieces: {
        V_INNER_TOP: 'red',
        O_N: 'black',
        O_NW1: 'black',
        O_NE1: 'black',
        CENTER: 'black',
        O_S: 'red',
        O_SW1: 'red',
        O_SE1: 'red',
        V_BOTTOM_ARC: 'red',
        O_SW2: 'red',
        O_SE2: 'red',
      },
      currentPlayer: 'red',
      result: { type: 'active', currentPlayer: 'red' },
      moveCount: 0,
      captured: { red: 0, black: 0 },
    }

    const result = applyMove(state, { from: 'V_INNER_TOP', to: 'V_TOP_ARC', player: 'red' })

    expect(result.state.pieces.V_TOP_ARC).toBe('red')
    expect(result.state.captured?.red).toBe(0)
  })

  it('detects draw before single-side win when both sides have two or fewer pieces', () => {
    const state: GameState = {
      pieces: {
        O_N: 'black',
        V_TOP_ARC: 'black',
        O_S: 'red',
        V_BOTTOM_ARC: 'red',
      },
      currentPlayer: 'red',
      result: { type: 'active', currentPlayer: 'red' },
      moveCount: 0,
      captured: { red: 4, black: 4 },
    }

    const result = applyMove(state, { from: 'V_BOTTOM_ARC', to: 'V_INNER_BOTTOM', player: 'red' })

    expect(result.state.result).toEqual({ type: 'draw' })
  })

  it('detects win when only opponent has two or fewer pieces', () => {
    const state: GameState = {
      pieces: {
        O_N: 'black',
        O_S: 'red',
        O_SW1: 'red',
        O_SE1: 'red',
      },
      currentPlayer: 'red',
      result: { type: 'active', currentPlayer: 'red' },
      moveCount: 0,
      captured: { red: 3, black: 5 },
    }

    const result = applyMove(state, { from: 'O_SW1', to: 'O_SW2', player: 'red' })

    expect(result.state.result).toEqual({ type: 'win', winner: 'red' })
  })

  it('counts pieces by player', () => {
    const state = createInitialState()

    expect(countPieces(state, 'red')).toBe(6)
    expect(countPieces(state, 'black')).toBe(6)
  })
})
