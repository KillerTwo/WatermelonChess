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
