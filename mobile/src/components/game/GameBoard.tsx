import React, { useMemo } from 'react'
import { styled, Stack } from '@tamagui/core'
import { GameCell } from '../ui/GameCell'
import { useGameStore } from '../../stores/gameStore'
import Board from '../../services/gameEngine/Board'

const BoardContainer = styled(Stack, {
  name: 'GameBoard',
  padding: '$4',
  backgroundColor: '$background',
  borderRadius: '$gameBoard',
  borderWidth: 2,
  borderColor: '$borderColor',
  
  variants: {
    size: {
      small: { 
        width: '$gameBoardSmall',
        height: '$gameBoardSmall',
      },
      normal: { 
        width: '$gameBoard',
        height: '$gameBoard',
      },
      large: { 
        width: '$gameBoardLarge',
        height: '$gameBoardLarge',
      },
    }
  } as const,
})

const GridContainer = styled(Stack, {
  gap: '$gameGap',
  
  variants: {
    gridSize: {
      3: {
        flexDirection: 'column',
      },
      4: {
        flexDirection: 'column',
      },
      5: {
        flexDirection: 'column',
      },
    }
  } as const,
})

const GridRow = styled(Stack, {
  flexDirection: 'row',
  gap: '$gameGap',
})

interface GameBoardProps {
  onCellPress: (index: number) => void
  size?: 'small' | 'normal' | 'large'
  disabled?: boolean
}

export const GameBoard: React.FC<GameBoardProps> = ({
  onCellPress,
  size = 'normal',
  disabled = false
}) => {
  const { grid, gridSize, gameState } = useGameStore()
  
  // Create a Board instance to check for winning combinations
  const board = useMemo(() => new Board(grid, gridSize), [grid, gridSize])
  const winner = board.getWinner()
  const winningCombination = board.winningCombination || []

  // Organize grid into rows
  const gridRows = useMemo(() => {
    const rows = []
    for (let i = 0; i < gridSize; i++) {
      const row = []
      for (let j = 0; j < gridSize; j++) {
        const index = i * gridSize + j
        row.push({
          index,
          value: grid[index],
          isWinning: winningCombination.includes(index)
        })
      }
      rows.push(row)
    }
    return rows
  }, [grid, gridSize, winningCombination])

  const isCellDisabled = (index: number) => {
    return disabled || 
           gameState !== 'playing' || 
           grid[index] !== null
  }

  return (
    <BoardContainer size={size}>
      <GridContainer gridSize={gridSize as 3 | 4 | 5}>
        {gridRows.map((row, rowIndex) => (
          <GridRow key={rowIndex}>
            {row.map((cell) => (
              <GameCell
                key={cell.index}
                value={cell.value}
                onPress={() => onCellPress(cell.index)}
                index={cell.index}
                isWinning={cell.isWinning}
                disabled={isCellDisabled(cell.index)}
              />
            ))}
          </GridRow>
        ))}
      </GridContainer>
    </BoardContainer>
  )
}