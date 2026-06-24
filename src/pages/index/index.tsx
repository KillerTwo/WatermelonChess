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
    if (state.result.type !== 'active' || state.currentPlayer !== 'black') {
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
  }, [difficulty, state])

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
