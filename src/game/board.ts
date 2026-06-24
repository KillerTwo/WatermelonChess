import type { GameState, LineSegment, Player, PointId, PointLayout } from './types'

export const POINTS: PointLayout[] = [
  { id: 'O_N', x: 50, y: 4 },
  { id: 'O_NE1', x: 69, y: 8 },
  { id: 'O_NE2', x: 92, y: 31 },
  { id: 'O_E', x: 96, y: 50 },
  { id: 'O_SE2', x: 92, y: 69 },
  { id: 'O_SE1', x: 69, y: 92 },
  { id: 'O_S', x: 50, y: 96 },
  { id: 'O_SW1', x: 31, y: 92 },
  { id: 'O_SW2', x: 8, y: 69 },
  { id: 'O_W', x: 4, y: 50 },
  { id: 'O_NW2', x: 8, y: 31 },
  { id: 'O_NW1', x: 31, y: 8 },
  { id: 'V_TOP_ARC', x: 50, y: 18 },
  { id: 'V_INNER_TOP', x: 50, y: 31 },
  { id: 'CENTER', x: 50, y: 50 },
  { id: 'V_INNER_BOTTOM', x: 50, y: 69 },
  { id: 'V_BOTTOM_ARC', x: 50, y: 82 },
  { id: 'H_LEFT_ARC', x: 18, y: 50 },
  { id: 'H_INNER_LEFT', x: 31, y: 50 },
  { id: 'H_INNER_RIGHT', x: 69, y: 50 },
  { id: 'H_RIGHT_ARC', x: 82, y: 50 },
]

export const RED_START_POINTS: PointId[] = ['O_S', 'O_SW1', 'O_SW2', 'O_SE1', 'O_SE2', 'V_BOTTOM_ARC']
export const BLACK_START_POINTS: PointId[] = ['O_N', 'O_NW1', 'O_NW2', 'O_NE1', 'O_NE2', 'V_TOP_ARC']

export const ADJACENCY: Record<PointId, PointId[]> = {
  O_N: ['O_NE1', 'O_NW1', 'V_TOP_ARC'],
  O_NE1: ['O_N', 'O_NE2', 'V_TOP_ARC'],
  O_NE2: ['O_NE1', 'O_E', 'H_RIGHT_ARC'],
  O_E: ['O_NE2', 'O_SE2', 'H_RIGHT_ARC'],
  O_SE2: ['O_E', 'O_SE1', 'H_RIGHT_ARC'],
  O_SE1: ['O_SE2', 'O_S', 'V_BOTTOM_ARC'],
  O_S: ['O_SE1', 'O_SW1', 'V_BOTTOM_ARC'],
  O_SW1: ['O_S', 'O_SW2', 'V_BOTTOM_ARC'],
  O_SW2: ['O_SW1', 'O_W', 'H_LEFT_ARC'],
  O_W: ['O_SW2', 'O_NW2', 'H_LEFT_ARC'],
  O_NW2: ['O_W', 'O_NW1', 'H_LEFT_ARC'],
  O_NW1: ['O_NW2', 'O_N', 'V_TOP_ARC'],
  V_TOP_ARC: ['O_N', 'O_NW1', 'O_NE1', 'V_INNER_TOP'],
  V_INNER_TOP: ['V_TOP_ARC', 'CENTER', 'H_INNER_LEFT', 'H_INNER_RIGHT'],
  CENTER: ['V_INNER_TOP', 'V_INNER_BOTTOM', 'H_INNER_LEFT', 'H_INNER_RIGHT'],
  V_INNER_BOTTOM: ['CENTER', 'V_BOTTOM_ARC', 'H_INNER_LEFT', 'H_INNER_RIGHT'],
  V_BOTTOM_ARC: ['V_INNER_BOTTOM', 'O_S', 'O_SW1', 'O_SE1'],
  H_LEFT_ARC: ['O_W', 'O_NW2', 'O_SW2', 'H_INNER_LEFT'],
  H_INNER_LEFT: ['H_LEFT_ARC', 'CENTER', 'V_INNER_TOP', 'V_INNER_BOTTOM'],
  H_INNER_RIGHT: ['CENTER', 'H_RIGHT_ARC', 'V_INNER_TOP', 'V_INNER_BOTTOM'],
  H_RIGHT_ARC: ['H_INNER_RIGHT', 'O_E', 'O_NE2', 'O_SE2'],
}

export const BOARD_LINES: LineSegment[] = [
  { id: 'outer-circle', kind: 'circle', className: 'board-line board-line--outer' },
  { id: 'vertical-axis', kind: 'line', className: 'board-line board-line--vertical' },
  { id: 'horizontal-axis', kind: 'line', className: 'board-line board-line--horizontal' },
  { id: 'inner-circle', kind: 'circle', className: 'board-line board-line--inner-circle' },
  { id: 'top-arc', kind: 'arc', className: 'board-line board-line--top-arc' },
  { id: 'bottom-arc', kind: 'arc', className: 'board-line board-line--bottom-arc' },
  { id: 'left-arc', kind: 'arc', className: 'board-line board-line--left-arc' },
  { id: 'right-arc', kind: 'arc', className: 'board-line board-line--right-arc' },
]

export const getNeighbors = (point: PointId): PointId[] => [...ADJACENCY[point]]

export const createInitialState = (): GameState => {
  const pieces: Partial<Record<PointId, Player>> = {}

  for (const point of RED_START_POINTS) {
    pieces[point] = 'red'
  }

  for (const point of BLACK_START_POINTS) {
    pieces[point] = 'black'
  }

  return {
    pieces,
    currentPlayer: 'red',
    result: { type: 'active', currentPlayer: 'red' },
    moveCount: 0,
    captured: { red: 0, black: 0 },
  }
}
