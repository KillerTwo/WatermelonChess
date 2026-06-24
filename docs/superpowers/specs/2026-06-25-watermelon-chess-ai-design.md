# Watermelon Chess AI Battle Design

Date: 2026-06-25
Project: Taro 4.2 + React + TypeScript cross-platform app
Scope: Phase 1 AI battle only. Online battle is not implemented in this phase, but core data structures and module boundaries must support a later upgrade.

## Goals

- Build a playable Watermelon Chess game for WeChat Mini Program and H5.
- Support human player versus AI only in phase 1.
- Use the provided 21-point Watermelon Chess board image as the fixed board model.
- Keep game rules, move validation, capture, win/draw detection, undo, and AI independent from Taro UI code.
- Preserve an upgrade path for future online battle by using serializable state and deterministic rule application.

## Non-Goals

- No online battle, room system, matchmaking, chat, account system, or server API in phase 1.
- No cross-platform tuning beyond WeChat Mini Program and H5 in phase 1.
- No custom board editor or alternate rule variants.

## Confirmed Rules

- The board has 21 fixed intersections based on the supplied image.
- Each side has six pieces.
- The human player is red, starts on the lower six points, and moves first.
- The AI is black and starts on the upper six points.
- A move selects one own piece and moves it along a route to an adjacent empty point.
- Jumping is not allowed.
- After a move, inspect all opponent connected groups.
- Every opponent group with no adjacent empty point is captured. If multiple groups are trapped by one move, all are captured.
- Suicide moves are allowed. A player may move into a position where their own connected group has no liberties. That group is not removed immediately by the mover's own turn.
- After captures, if both sides have two or fewer pieces, the game is a draw.
- Otherwise, if one side has two or fewer pieces, the other side wins.
- Undo restores the position before the latest full human-plus-AI round. If the AI has not moved yet, undo restores the position before the latest human move.

## Architecture

Use a pure game core plus Taro React presentation layer.

### `src/game/`

This directory owns all UI-independent TypeScript logic:

- Board point IDs, relative coordinates, and adjacency table.
- Initial piece placement.
- `GameState`, `Move`, `Player`, game status, and history-related types.
- Legal move generation and move validation.
- `applyMove(state, move)` for deterministic state transitions.
- Connected group discovery and capture resolution.
- Win/draw detection.
- AI move selection for all difficulties.
- Snapshot helpers for undo.

The game module must not depend on Taro APIs, React components, browser DOM APIs, or storage APIs.

### `src/pages/index/`

The main page owns session-level UI state:

- Current `GameState`.
- Selected point.
- Legal target hints for the selected piece.
- AI difficulty.
- AI thinking state.
- User-facing status text.
- Undo and restart actions.

The page calls the game core for all rule changes. It must not duplicate rule logic in component event handlers.

### `src/components/`

Reusable visual components can be introduced as needed:

- `BoardView` for the board, pieces, selection, and legal target hints.
- `GamePanel` for status, difficulty, restart, undo, and rule hints.
- Small presentational components for piece or action controls if useful.

## Board Model

The board is represented by stable point IDs and an adjacency table.

The visual model follows the supplied 21-point image:

- 12 points on the outer circle.
- 5 points on the vertical center line.
- 5 points on the horizontal center line.
- The vertical and horizontal lines share the center point.
- Four inner arc segments connect only the visible endpoints and midpoint shown in the image.

The rules engine uses only the adjacency table. Rendering uses point coordinates and line/arc metadata. This separation keeps move validation independent from drawing details.

## AI Design

AI uses a unified strategy interface:

```ts
type AiStrategy = (state: GameState, options: AiOptions) => Move | null
```

The page asks the selected strategy for a legal black move after the human red move resolves and the game remains active.

### Easy

Easy mode randomly selects one legal move.

### Medium

Medium mode uses one-ply scoring:

- Prefer moves that capture more red pieces.
- Avoid moves that allow an immediate high-value capture by red.
- Prefer moves that improve black mobility.
- Prefer moves that reduce red mobility.

### Hard

Hard mode uses minimax with alpha-beta pruning:

- Start at depth 4.
- Allow tuning to depth 5 or 6 if WeChat Mini Program and H5 performance remains acceptable.
- Use terminal scores for win/loss/draw.
- Use heuristic scoring for non-terminal states:
  - Piece count difference.
  - Legal move count difference.
  - Number and size of vulnerable groups.
  - Opponent mobility reduction.
  - Positional preference for flexible central points.

The UI shows an AI thinking state and disables human input while AI is selecting a move. If iterative deepening or time limits are added, the AI returns the best completed move within the configured limit.

## Interaction Flow

1. Red player taps one of their pieces.
2. The board highlights adjacent empty legal target points.
3. Red player taps a target point.
4. The page creates a `Move` and passes it to `applyMove`.
5. The game core moves the piece, captures trapped black groups, and checks draw/win status.
6. If the game is still active, the page enters AI thinking state.
7. AI selects a black move.
8. The page passes the AI move to `applyMove`.
9. The game core moves the piece, captures trapped red groups, and checks draw/win status.
10. The page exits AI thinking state and waits for the next red move.

Illegal taps do not mutate game state. They either keep the current selection or clear it, depending on the interaction context.

## Undo And Restart

History is stored as serializable snapshots.

- Before a human move, save a snapshot for the current round.
- If the human move ends the game before AI moves, undo restores that snapshot.
- If AI also moves, undo still restores the same pre-human-move snapshot.
- Restart discards history and creates a fresh initial state with the selected difficulty.

## Error Handling

- `applyMove` rejects moves from the wrong player, moves from an empty point, moves to an occupied point, non-adjacent moves, and moves after the game has ended.
- UI event handlers should avoid calling `applyMove` with known invalid moves, but the game core remains authoritative.
- If AI receives a state with no legal moves while the game is active, it returns no move and the page shows a no-move status. The game status logic remains responsible for deciding whether the position is terminal.

## Testing Strategy

Primary tests should target `src/game/` because it is pure TypeScript.

Required coverage:

- Board has 21 unique points.
- Adjacency is symmetric.
- Initial state has six red and six black pieces in the confirmed lower/upper positions.
- Legal move generation only returns adjacent empty targets.
- Jumping is rejected.
- Single trapped opponent group is captured.
- Multiple trapped opponent groups are all captured.
- Suicide moves are legal and do not self-capture immediately.
- Draw is detected when both sides have two or fewer pieces after capture.
- Win is detected when only one side has two or fewer pieces.
- Undo restores the pre-round snapshot.
- All AI difficulties return legal moves when legal moves exist.

Build verification for phase 1:

- `npm run build:weapp`
- `npm run build:h5`

If a test runner is added, prefer Vitest for the pure game core. Avoid heavy end-to-end tests in phase 1 unless regressions justify them.

## Online Battle Upgrade Path

Phase 1 must keep these online-ready constraints:

- `GameState` is serializable JSON data.
- `Move` is serializable JSON data with `from`, `to`, `player`, and optional metadata.
- `applyMove(state, move)` is deterministic and can be reused by client, server, tests, and replay.
- UI does not directly mutate board arrays.
- Opponent behavior is abstracted so AI can later be replaced by a remote opponent provider.

Future online battle can add:

- Room creation and joining.
- Player seat assignment for red/black.
- Server-authoritative move validation.
- Remote move confirmation before local state transition, or optimistic transition with rollback.
- Reconnect and state resync.
- Move log and replay.
- Optional server-side AI using the same rule engine.

The first phase does not implement these features. It only preserves the interfaces that make them practical later.

## Acceptance Criteria

- A user can complete a full red-versus-black AI game on WeChat Mini Program and H5.
- The board matches the supplied 21-point Watermelon Chess layout.
- Red starts at the lower six points and moves first.
- Easy, medium, and hard AI difficulties are available.
- Captures, multiple captures, suicide moves, win, draw, undo, and restart behave according to the confirmed rules.
- Game logic is separated from Taro UI and can be tested independently.
- The design remains compatible with a future online battle mode.
