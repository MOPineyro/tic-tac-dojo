import React from 'react'
import { styled, Stack, Text } from '@tamagui/core'
import { Player } from '../../services/gameEngine/Board'

const CellContainer = styled(Stack, {
  name: 'GameCell',
  width: '$gameCell',
  height: '$gameCell',
  borderRadius: '$gameCell',
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 2,
  borderColor: '$borderColor',
  pressStyle: { scale: 0.95 },
  
  variants: {
    state: {
      empty: { 
        backgroundColor: '$cellEmpty',
        borderColor: '$borderColor',
      },
      x: { 
        backgroundColor: '$cellX',
        borderColor: '$playerX',
      },
      o: { 
        backgroundColor: '$cellO',
        borderColor: '$playerO',
      },
    },
    winning: {
      true: {
        borderColor: '$accent',
        borderWidth: 3,
        backgroundColor: '$powerUp',
      }
    },
    disabled: {
      true: {
        opacity: 0.6,
        pressStyle: { scale: 1 },
      }
    }
  } as const,
})

const CellText = styled(Text, {
  fontSize: 28,
  fontWeight: 'bold',
  textAlign: 'center',
  
  variants: {
    player: {
      X: { color: '$playerX' },
      O: { color: '$playerO' },
      null: { opacity: 0 },
    }
  } as const,
})

interface GameCellProps {
  value: Player
  onPress: () => void
  index: number
  isWinning?: boolean
  disabled?: boolean
}

export const GameCell: React.FC<GameCellProps> = ({
  value,
  onPress,
  index,
  isWinning = false,
  disabled = false
}) => {
  const getCellState = () => {
    if (value === 'X') return 'x'
    if (value === 'O') return 'o'
    return 'empty'
  }

  const getDisplayValue = () => {
    if (value === 'X') return '×'
    if (value === 'O') return '◯'
    return ''
  }

  return (
    <CellContainer
      state={getCellState()}
      winning={isWinning}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      animation="bouncy"
      enterStyle={{ scale: 0.8, opacity: 0 }}
      exitStyle={{ scale: 0.8, opacity: 0 }}
    >
      <CellText player={value}>
        {getDisplayValue()}
      </CellText>
    </CellContainer>
  )
}