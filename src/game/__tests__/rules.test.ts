import { describe, expect, it } from 'vitest'
import {
  ADJACENCY,
  BLACK_START_POINTS,
  POINTS,
  RED_START_POINTS,
  createInitialState,
  getNeighbors,
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
