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
          红方吃 {state.captured?.black ?? 0} 子 · 黑方吃 {state.captured?.red ?? 0} 子 · 第 {state.moveCount + 1} 手
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
