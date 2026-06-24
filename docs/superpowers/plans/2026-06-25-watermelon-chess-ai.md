# Watermelon Chess AI Battle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first playable Watermelon Chess phase: human red player versus black AI, with confirmed rules, undo, restart, three AI difficulties, and WeChat Mini Program plus H5 builds.

**Architecture:** Implement a pure TypeScript game core under `src/game/`, then connect it to Taro React components under `src/components/` and `src/pages/index/`. Keep `GameState` and `Move` serializable so online battle can later reuse the same deterministic rule engine.

**Tech Stack:** Taro 4.2, React 18, TypeScript, CSS, Vitest for pure game-core tests.

---

## File Structure

- Create: `src/game/types.ts` for `Player`, `PointId`, `PieceMap`, `GameState`, `Move`, game status, AI difficulty, and errors.
- Create: `src/game/board.ts` for the 21-point board coordinates, initial red/black positions, adjacency table, and board drawing metadata.
- Create: `src/game/rules.ts` for legal moves, validation, connected groups, capture, win/draw status, and deterministic `applyMove`.
- Create: `src/game/history.ts` for serializable snapshot stack helpers.
- Create: `src/game/ai.ts` for easy, medium, and hard AI strategies.
- Create: `src/game/index.ts` as the public export surface.
- Create: `src/game/__tests__/rules.test.ts` for board/rules/history coverage.
- Create: `src/game/__tests__/ai.test.ts` for AI legality and terminal behavior.
- Modify: `package.json` to add Vitest scripts and dev dependency.
- Modify: `package-lock.json` after installing Vitest.
- Create: `src/components/BoardView.tsx` for board rendering and point click handling.
- Create: `src/components/BoardView.css` for board layout, routes, points, pieces, and responsive sizing.
- Create: `src/components/GamePanel.tsx` for status, difficulty, restart, undo, and concise rule hint.
- Create: `src/components/GamePanel.css` for panel styling.
- Modify: `src/pages/index/index.tsx` to own the game session and wire UI to game core.
- Modify: `src/pages/index/index.css` for page shell styling.
- Modify: `src/pages/index/index.config.ts` to set the navigation title to `西瓜棋`.

## Task 1: Test Runner And Core Types

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/game/types.ts`
- Create: `src/game/index.ts`
- Test command: `npm run test:game -- --run`

- [ ] **Step 1: Install Vitest**

Run:

```bash
npm install -D vitest
```

Expected: `package.json` and `package-lock.json` include `vitest` in `devDependencies`.

- [ ] **Step 2: Add test scripts**

Update `package.json` scripts to include:

```json
{
  "test:game": "vitest src/game",
  "test:game:run": "vitest run src/game"
}
```

Keep existing Taro scripts unchanged.

- [ ] **Step 3: Create core types**

Create `src/game/types.ts`:

```ts
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
```

- [ ] **Step 4: Create public game barrel**

Create `src/game/index.ts`:

```ts
export * from './types'
```

- [ ] **Step 5: Run tests to verify runner works**

Run:

```bash
npm run test:game:run
```

Expected: Vitest starts and reports no test files found or no tests. If Vitest exits non-zero because there are no tests, continue; Task 2 adds tests.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/game/types.ts src/game/index.ts
git commit -m "chore: add game test setup and types"
```

## Task 2: Board Model

**Files:**
- Create: `src/game/board.ts`
- Modify: `src/game/index.ts`
- Create: `src/game/__tests__/rules.test.ts`

- [ ] **Step 1: Write failing board tests**

Create `src/game/__tests__/rules.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm run test:game:run
```

Expected: FAIL because `board.ts` exports do not exist.

- [ ] **Step 3: Implement board model**

Create `src/game/board.ts`:

```ts
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
  V_INNER_TOP: ['V_TOP_ARC', 'CENTER'],
  CENTER: ['V_INNER_TOP', 'V_INNER_BOTTOM', 'H_INNER_LEFT', 'H_INNER_RIGHT'],
  V_INNER_BOTTOM: ['CENTER', 'V_BOTTOM_ARC'],
  V_BOTTOM_ARC: ['V_INNER_BOTTOM', 'O_S', 'O_SW1', 'O_SE1'],
  H_LEFT_ARC: ['O_W', 'O_NW2', 'O_SW2', 'H_INNER_LEFT'],
  H_INNER_LEFT: ['H_LEFT_ARC', 'CENTER'],
  H_INNER_RIGHT: ['CENTER', 'H_RIGHT_ARC'],
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
```

- [ ] **Step 4: Export board model**

Update `src/game/index.ts`:

```ts
export * from './types'
export * from './board'
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm run test:game:run
```

Expected: PASS for board model tests.

- [ ] **Step 6: Commit**

```bash
git add src/game/board.ts src/game/index.ts src/game/__tests__/rules.test.ts
git commit -m "feat: model watermelon chess board"
```

## Task 3: Rules Engine And Captures

**Files:**
- Create: `src/game/rules.ts`
- Modify: `src/game/index.ts`
- Modify: `src/game/__tests__/rules.test.ts`

- [ ] **Step 1: Append failing rules tests**

Append to `src/game/__tests__/rules.test.ts`:

```ts
import {
  applyMove,
  countPieces,
  findConnectedGroups,
  generateLegalMoves,
  getLegalTargets,
  validateMove,
} from '..'

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
    expect(blackGroups).toEqual([['O_N'], ['O_E']])
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

    const result = applyMove(state, { from: 'CENTER', to: 'V_TOP_ARC', player: 'red' })

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

  it('allows suicide moves without self-capture', () => {
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
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm run test:game:run
```

Expected: FAIL because rules exports do not exist.

- [ ] **Step 3: Implement rules engine**

Create `src/game/rules.ts`:

```ts
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
```

- [ ] **Step 4: Export rules**

Update `src/game/index.ts`:

```ts
export * from './types'
export * from './board'
export * from './rules'
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm run test:game:run
```

Expected: PASS for board and rules tests. If fixture moves are invalid because an occupied target blocks the test position, update only the fixture board state, not the production rules.

- [ ] **Step 6: Commit**

```bash
git add src/game/rules.ts src/game/index.ts src/game/__tests__/rules.test.ts
git commit -m "feat: implement watermelon chess rules"
```

## Task 4: Undo History

**Files:**
- Create: `src/game/history.ts`
- Modify: `src/game/index.ts`
- Modify: `src/game/__tests__/rules.test.ts`

- [ ] **Step 1: Append failing history tests**

Append to `src/game/__tests__/rules.test.ts`:

```ts
import { createHistory, pushSnapshot, restoreLatestSnapshot } from '..'

describe('game history', () => {
  it('stores immutable snapshots and restores the latest snapshot', () => {
    const initial = createInitialState()
    const history = createHistory()
    const nextHistory = pushSnapshot(history, initial)
    const moved = applyMove(initial, { from: 'V_BOTTOM_ARC', to: 'V_INNER_BOTTOM', player: 'red' }).state
    const restored = restoreLatestSnapshot(nextHistory)

    expect(moved.pieces.V_INNER_BOTTOM).toBe('red')
    expect(restored.state).toEqual(initial)
    expect(restored.history).toEqual([])
  })

  it('returns null when restoring from empty history', () => {
    expect(restoreLatestSnapshot(createHistory())).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm run test:game:run
```

Expected: FAIL because history exports do not exist.

- [ ] **Step 3: Implement history helpers**

Create `src/game/history.ts`:

```ts
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
```

- [ ] **Step 4: Export history**

Update `src/game/index.ts`:

```ts
export * from './types'
export * from './board'
export * from './rules'
export * from './history'
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm run test:game:run
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game/history.ts src/game/index.ts src/game/__tests__/rules.test.ts
git commit -m "feat: add round undo history"
```

## Task 5: AI Strategies

**Files:**
- Create: `src/game/ai.ts`
- Create: `src/game/__tests__/ai.test.ts`
- Modify: `src/game/index.ts`

- [ ] **Step 1: Write failing AI tests**

Create `src/game/__tests__/ai.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  chooseAiMove,
  createInitialState,
  generateLegalMoves,
  isMoveLegal,
} from '..'
import type { GameState } from '..'

const expectLegalAiMove = (state: GameState, difficulty: 'easy' | 'medium' | 'hard') => {
  const move = chooseAiMove(state, { difficulty })

  expect(move).not.toBeNull()
  expect(isMoveLegal(state, move!)).toBe(true)
}

describe('ai strategies', () => {
  it('easy ai returns a legal move', () => {
    const state = {
      ...createInitialState(),
      currentPlayer: 'black',
      result: { type: 'active', currentPlayer: 'black' },
    } as GameState

    expectLegalAiMove(state, 'easy')
  })

  it('medium ai returns a legal move', () => {
    const state = {
      ...createInitialState(),
      currentPlayer: 'black',
      result: { type: 'active', currentPlayer: 'black' },
    } as GameState

    expectLegalAiMove(state, 'medium')
  })

  it('hard ai returns a legal move', () => {
    const state = {
      ...createInitialState(),
      currentPlayer: 'black',
      result: { type: 'active', currentPlayer: 'black' },
    } as GameState

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
      captured: { red: 4, black: 4 },
    }

    expect(generateLegalMoves(state, 'black')).toEqual([])
    expect(chooseAiMove(state, { difficulty: 'hard' })).toBeNull()
  })
})
```

- [ ] **Step 2: Add `isMoveLegal` helper test failure**

Run:

```bash
npm run test:game:run
```

Expected: FAIL because `ai.ts` and `isMoveLegal` do not exist.

- [ ] **Step 3: Add `isMoveLegal` to rules**

Modify `src/game/rules.ts`:

```ts
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
```

Place it after `validateMove`.

- [ ] **Step 4: Implement AI**

Create `src/game/ai.ts`:

```ts
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
      score: minimax(applyMove(state, move).state, depth - 1, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, aiPlayer),
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
```

- [ ] **Step 5: Export AI**

Update `src/game/index.ts`:

```ts
export * from './types'
export * from './board'
export * from './rules'
export * from './history'
export * from './ai'
```

- [ ] **Step 6: Run AI tests**

Run:

```bash
npm run test:game:run
```

Expected: PASS for rules and AI tests.

- [ ] **Step 7: Commit**

```bash
git add src/game/ai.ts src/game/rules.ts src/game/index.ts src/game/__tests__/ai.test.ts
git commit -m "feat: add ai move strategies"
```

## Task 6: Board And Panel Components

**Files:**
- Create: `src/components/BoardView.tsx`
- Create: `src/components/BoardView.css`
- Create: `src/components/GamePanel.tsx`
- Create: `src/components/GamePanel.css`

- [ ] **Step 1: Create board component**

Create `src/components/BoardView.tsx`:

```tsx
import { View } from '@tarojs/components'
import { BOARD_LINES, POINTS } from '../game'
import type { GameState, PointId } from '../game'
import './BoardView.css'

interface BoardViewProps {
  state: GameState
  selectedPoint?: PointId
  legalTargets: PointId[]
  disabled: boolean
  onPointClick: (point: PointId) => void
}

export default function BoardView({
  state,
  selectedPoint,
  legalTargets,
  disabled,
  onPointClick,
}: BoardViewProps) {
  return (
    <View className='board-shell'>
      <View className='board-surface'>
        {BOARD_LINES.map((line) => (
          <View key={line.id} className={line.className} />
        ))}

        {POINTS.map((point) => {
          const piece = state.pieces[point.id]
          const isSelected = selectedPoint === point.id
          const isTarget = legalTargets.includes(point.id)
          const classNames = [
            'board-point',
            piece ? `board-point--${piece}` : '',
            isSelected ? 'board-point--selected' : '',
            isTarget ? 'board-point--target' : '',
            disabled ? 'board-point--disabled' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <View
              key={point.id}
              className={classNames}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
              onClick={() => {
                if (!disabled) {
                  onPointClick(point.id)
                }
              }}
            >
              {piece ? <View className='board-piece-shine' /> : null}
            </View>
          )
        })}
      </View>
    </View>
  )
}
```

- [ ] **Step 2: Create board CSS**

Create `src/components/BoardView.css`:

```css
.board-shell {
  width: min(92vw, 680px);
  margin: 28px auto 24px;
  padding: 22px;
  border-radius: 32px;
  background: linear-gradient(145deg, #f4d18d 0%, #e8a948 55%, #8d4d1f 100%);
  box-shadow: 0 22px 42px rgba(71, 34, 8, 0.28);
}

.board-surface {
  position: relative;
  width: 100%;
  padding-bottom: 100%;
  border-radius: 50%;
  background: radial-gradient(circle at 45% 40%, #fff6df 0%, #f5d48d 58%, #d98438 100%);
  overflow: hidden;
}

.board-line {
  position: absolute;
  pointer-events: none;
  border-color: #2a160d;
}

.board-line--outer {
  inset: 4%;
  border: 8px solid #2a160d;
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgba(42, 22, 13, 0.18);
}

.board-line--vertical {
  left: 50%;
  top: 4%;
  width: 4px;
  height: 92%;
  margin-left: -2px;
  background: #2a160d;
}

.board-line--horizontal {
  left: 4%;
  top: 50%;
  width: 92%;
  height: 4px;
  margin-top: -2px;
  background: #2a160d;
}

.board-line--inner-circle {
  left: 31%;
  top: 31%;
  width: 38%;
  height: 38%;
  border: 4px solid #2a160d;
  border-radius: 50%;
}

.board-line--top-arc,
.board-line--bottom-arc {
  left: 31%;
  width: 38%;
  height: 18%;
  border: 4px solid #2a160d;
  border-radius: 0 0 50% 50%;
}

.board-line--top-arc {
  top: 8%;
  border-top: 0;
}

.board-line--bottom-arc {
  bottom: 8%;
  border-bottom: 0;
  border-radius: 50% 50% 0 0;
}

.board-line--left-arc,
.board-line--right-arc {
  top: 31%;
  width: 18%;
  height: 38%;
  border: 4px solid #2a160d;
}

.board-line--left-arc {
  left: 8%;
  border-left: 0;
  border-radius: 0 50% 50% 0;
}

.board-line--right-arc {
  right: 8%;
  border-right: 0;
  border-radius: 50% 0 0 50%;
}

.board-point {
  position: absolute;
  z-index: 2;
  width: 30px;
  height: 30px;
  margin-left: -15px;
  margin-top: -15px;
  border-radius: 50%;
  background: #1f120b;
  border: 4px solid #1f120b;
  box-sizing: border-box;
}

.board-point--red,
.board-point--black {
  width: 42px;
  height: 42px;
  margin-left: -21px;
  margin-top: -21px;
  box-shadow: 0 8px 16px rgba(39, 18, 6, 0.28);
}

.board-point--red {
  background: radial-gradient(circle at 35% 30%, #ffb2a0 0%, #df2e20 48%, #78120d 100%);
  border-color: #7c120c;
}

.board-point--black {
  background: radial-gradient(circle at 35% 30%, #5d5b55 0%, #1d1a17 58%, #050403 100%);
  border-color: #050403;
}

.board-piece-shine {
  position: absolute;
  left: 8px;
  top: 7px;
  width: 10px;
  height: 7px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.42);
}

.board-point--selected {
  outline: 6px solid rgba(255, 241, 143, 0.92);
}

.board-point--target {
  background: #ffe875;
  border-color: #7d4d05;
  box-shadow: 0 0 0 8px rgba(255, 232, 117, 0.28);
}

.board-point--disabled {
  opacity: 0.74;
}
```

- [ ] **Step 3: Create panel component**

Create `src/components/GamePanel.tsx`:

```tsx
import { Button, Picker, Text, View } from '@tarojs/components'
import type { AiDifficulty, GameState } from '../game'
import './GamePanel.css'

const DIFFICULTIES: AiDifficulty[] = ['easy', 'medium', 'hard']
const DIFFICULTY_LABELS: Record<AiDifficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}

interface GamePanelProps {
  state: GameState
  difficulty: AiDifficulty
  statusText: string
  canUndo: boolean
  aiThinking: boolean
  onDifficultyChange: (difficulty: AiDifficulty) => void
  onUndo: () => void
  onRestart: () => void
}

export default function GamePanel({
  state,
  difficulty,
  statusText,
  canUndo,
  aiThinking,
  onDifficultyChange,
  onUndo,
  onRestart,
}: GamePanelProps) {
  const difficultyIndex = DIFFICULTIES.indexOf(difficulty)

  return (
    <View className='game-panel'>
      <View className='game-panel__status'>
        <Text className='game-panel__eyebrow'>西瓜棋 AI 对战</Text>
        <Text className='game-panel__title'>{statusText}</Text>
        <Text className='game-panel__meta'>
          红方 {state.captured?.black ?? 0} 吃 · 黑方 {state.captured?.red ?? 0} 吃 · 第 {state.moveCount + 1} 手
        </Text>
      </View>

      <View className='game-panel__actions'>
        <Picker
          mode='selector'
          range={DIFFICULTIES.map((item) => DIFFICULTY_LABELS[item])}
          value={difficultyIndex}
          disabled={aiThinking}
          onChange={(event) => {
            const next = DIFFICULTIES[Number(event.detail.value)]
            onDifficultyChange(next)
          }}
        >
          <View className='game-panel__picker'>难度：{DIFFICULTY_LABELS[difficulty]}</View>
        </Picker>

        <Button className='game-panel__button' disabled={!canUndo || aiThinking} onClick={onUndo}>
          悔棋
        </Button>
        <Button className='game-panel__button game-panel__button--primary' disabled={aiThinking} onClick={onRestart}>
          重开
        </Button>
      </View>

      <Text className='game-panel__hint'>沿线走到相邻空点；走完后，对方无路可走的整块棋会被全部吃掉。</Text>
    </View>
  )
}
```

- [ ] **Step 4: Create panel CSS**

Create `src/components/GamePanel.css`:

```css
.game-panel {
  width: min(92vw, 680px);
  margin: 0 auto 28px;
  padding: 24px;
  border-radius: 28px;
  background: rgba(255, 248, 226, 0.92);
  box-shadow: 0 16px 32px rgba(78, 42, 14, 0.14);
  box-sizing: border-box;
}

.game-panel__status {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.game-panel__eyebrow {
  font-size: 24px;
  color: #8a4a18;
  letter-spacing: 4px;
}

.game-panel__title {
  font-size: 38px;
  font-weight: 800;
  color: #281408;
}

.game-panel__meta,
.game-panel__hint {
  font-size: 24px;
  line-height: 1.5;
  color: #74431e;
}

.game-panel__actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 22px 0 16px;
}

.game-panel__picker,
.game-panel__button {
  min-width: 132px;
  height: 64px;
  line-height: 64px;
  padding: 0 20px;
  border-radius: 999px;
  background: #f0cf87;
  color: #321908;
  font-size: 24px;
  text-align: center;
}

.game-panel__button {
  margin: 0;
  border: 0;
}

.game-panel__button--primary {
  background: #9f2d19;
  color: #fff7df;
}
```

- [ ] **Step 5: Run TypeScript check**

Run:

```bash
npx tsc --noEmit --pretty false
```

Expected: PASS. If TypeScript reports component syntax errors, fix the reported line and rerun.

- [ ] **Step 6: Commit**

```bash
git add src/components/BoardView.tsx src/components/BoardView.css src/components/GamePanel.tsx src/components/GamePanel.css
git commit -m "feat: add game board components"
```

## Task 7: Page Integration

**Files:**
- Modify: `src/pages/index/index.tsx`
- Modify: `src/pages/index/index.css`
- Modify: `src/pages/index/index.config.ts`

- [ ] **Step 1: Replace index page logic**

Replace `src/pages/index/index.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { View } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import BoardView from '../../components/BoardView'
import GamePanel from '../../components/GamePanel'
import {
  applyMove,
  chooseAiMove,
  createHistory,
  createInitialState,
  getLegalTargets,
  pushSnapshot,
  restoreLatestSnapshot,
} from '../../game'
import type { AiDifficulty, GameHistory, GameState, PointId } from '../../game'
import './index.css'

const getStatusText = (state: GameState, aiThinking: boolean): string => {
  if (aiThinking) {
    return '黑方思考中'
  }

  if (state.result.type === 'draw') {
    return '双方只剩两子，和棋'
  }

  if (state.result.type === 'win') {
    return state.result.winner === 'red' ? '红方获胜' : '黑方获胜'
  }

  return state.currentPlayer === 'red' ? '红方行棋' : '黑方行棋'
}

export default function Index() {
  const [state, setState] = useState<GameState>(() => createInitialState())
  const [history, setHistory] = useState<GameHistory>(() => createHistory())
  const [selectedPoint, setSelectedPoint] = useState<PointId>()
  const [difficulty, setDifficulty] = useState<AiDifficulty>('medium')
  const [aiThinking, setAiThinking] = useState(false)

  useLoad(() => {
    console.log('Watermelon Chess loaded.')
  })

  const legalTargets = selectedPoint ? getLegalTargets(state, selectedPoint) : []
  const disabled = aiThinking || state.result.type !== 'active' || state.currentPlayer !== 'red'

  const handlePointClick = (point: PointId) => {
    if (disabled) {
      return
    }

    if (selectedPoint && legalTargets.includes(point)) {
      const snapshotHistory = pushSnapshot(history, state)
      const next = applyMove(state, { from: selectedPoint, to: point, player: 'red' }).state

      setHistory(snapshotHistory)
      setSelectedPoint(undefined)
      setState(next)
      return
    }

    if (state.pieces[point] === 'red') {
      setSelectedPoint(point)
      return
    }

    setSelectedPoint(undefined)
  }

  useEffect(() => {
    if (state.result.type !== 'active' || state.currentPlayer !== 'black' || aiThinking) {
      return
    }

    setAiThinking(true)

    const timer = setTimeout(() => {
      const aiMove = chooseAiMove(state, { difficulty })

      if (aiMove) {
        setState(applyMove(state, aiMove).state)
      }

      setAiThinking(false)
    }, 320)

    return () => {
      clearTimeout(timer)
    }
  }, [aiThinking, difficulty, state])

  const handleUndo = () => {
    const restored = restoreLatestSnapshot(history)

    if (!restored || aiThinking) {
      return
    }

    setState(restored.state)
    setHistory(restored.history)
    setSelectedPoint(undefined)
  }

  const handleRestart = () => {
    if (aiThinking) {
      return
    }

    setState(createInitialState())
    setHistory(createHistory())
    setSelectedPoint(undefined)
  }

  return (
    <View className='index'>
      <GamePanel
        state={state}
        difficulty={difficulty}
        statusText={getStatusText(state, aiThinking)}
        canUndo={history.length > 0}
        aiThinking={aiThinking}
        onDifficultyChange={setDifficulty}
        onUndo={handleUndo}
        onRestart={handleRestart}
      />
      <BoardView
        state={state}
        selectedPoint={selectedPoint}
        legalTargets={legalTargets}
        disabled={disabled}
        onPointClick={handlePointClick}
      />
    </View>
  )
}
```

- [ ] **Step 2: Replace page CSS**

Replace `src/pages/index/index.css`:

```css
.index {
  min-height: 100vh;
  padding: 28px 0 42px;
  background:
    radial-gradient(circle at 12% 14%, rgba(255, 237, 153, 0.48) 0, transparent 26%),
    radial-gradient(circle at 88% 18%, rgba(176, 64, 30, 0.22) 0, transparent 24%),
    linear-gradient(160deg, #fff1bf 0%, #e6a13e 52%, #753919 100%);
  box-sizing: border-box;
}
```

- [ ] **Step 3: Update page title**

Replace `src/pages/index/index.config.ts`:

```ts
export default definePageConfig({
  navigationBarTitleText: '西瓜棋'
})
```

- [ ] **Step 4: Run game tests**

Run:

```bash
npm run test:game:run
```

Expected: PASS.

- [ ] **Step 5: Run H5 build**

Run:

```bash
npm run build:h5
```

Expected: PASS. If CSS minification or Taro component typing fails, fix the concrete reported line and rerun.

- [ ] **Step 6: Commit**

```bash
git add src/pages/index/index.tsx src/pages/index/index.css src/pages/index/index.config.ts
git commit -m "feat: wire ai battle page"
```

## Task 8: Cross-Platform Verification And Polish

**Files:**
- Modify only files with concrete failures found by the commands below.

- [ ] **Step 1: Run WeChat Mini Program build**

Run:

```bash
npm run build:weapp
```

Expected: PASS.

- [ ] **Step 2: Run H5 build again**

Run:

```bash
npm run build:h5
```

Expected: PASS.

- [ ] **Step 3: Run game tests again**

Run:

```bash
npm run test:game:run
```

Expected: PASS.

- [ ] **Step 4: Inspect generated output for both targets**

Run:

```bash
ls dist
```

Expected: output directories/files exist from the latest Taro builds. Do not commit `dist` unless the repository already tracks generated build output.

- [ ] **Step 5: Commit final fixes if any**

If Step 1-3 required source fixes, commit them:

```bash
git add src package.json package-lock.json
git commit -m "fix: verify watermelon chess builds"
```

If no source fixes were needed, do not create an empty commit.

## Self-Review Notes

- Spec coverage: Board model, confirmed rules, multiple capture, suicide move, win/draw order, undo, three AI difficulties, UI flow, WeChat Mini Program build, H5 build, and online-ready serializable state are all mapped to tasks.
- Placeholder scan: No planned step uses unresolved placeholder language. Any implementation adjustment must be tied to a concrete failing test or build error.
- Type consistency: Public types are defined in Task 1, board exports in Task 2, rules in Task 3, history in Task 4, AI in Task 5, and UI consumes the barrel exports after those tasks exist.
