export type Player = 'red' | 'black'

export type PointId =
  | 'O_N'
  | 'O_NE1'
  | 'O_NE2'
  | 'O_E'
  | 'O_SE2'
  | 'O_SE1'
  | 'O_S'
  | 'O_SW1'
  | 'O_SW2'
  | 'O_W'
  | 'O_NW2'
  | 'O_NW1'
  | 'V_TOP_ARC'
  | 'V_INNER_TOP'
  | 'CENTER'
  | 'V_INNER_BOTTOM'
  | 'V_BOTTOM_ARC'
  | 'H_LEFT_ARC'
  | 'H_INNER_LEFT'
  | 'H_INNER_RIGHT'
  | 'H_RIGHT_ARC'

export type PieceMap = Partial<Record<PointId, Player>>

export interface Move {
  from: PointId
  to: PointId
  player: Player
}

export type GameResult =
  | { type: 'active'; currentPlayer: Player }
  | { type: 'win'; winner: Player }
  | { type: 'draw' }

export interface GameState {
  pieces: PieceMap
  currentPlayer: Player
  result: GameResult
  moveCount: number
  lastMove?: Move
  captured?: Record<Player, number>
}

export type AiDifficulty = 'easy' | 'medium' | 'hard'

export interface PointLayout {
  id: PointId
  x: number
  y: number
}

export interface LineSegment {
  id: string
  kind: 'line' | 'arc' | 'circle'
  className: string
}

export interface ApplyMoveResult {
  state: GameState
  capturedPoints: PointId[]
}

export interface MoveScore {
  move: Move
  score: number
}

export class InvalidMoveError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidMoveError'
  }
}

export const opponentOf = (player: Player): Player => (player === 'red' ? 'black' : 'red')
