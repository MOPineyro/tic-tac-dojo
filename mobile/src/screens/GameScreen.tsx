import React, { useEffect, useCallback } from 'react'
import { styled, Stack, Text, Button, XStack, YStack } from '@tamagui/core'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GameBoard } from '../components/game/GameBoard'
import { useGameStore } from '../stores/gameStore'
import AIPlayer from '../services/aiPlayer/AIPlayer'
import Board from '../services/gameEngine/Board'

const ScreenContainer = styled(YStack, {
  flex: 1,
  backgroundColor: '$background',
  padding: '$screenPadding',
})

const Header = styled(XStack, {
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: '$2',
  marginBottom: '$4',
})

const ScoreContainer = styled(Stack, {
  alignItems: 'center',
  padding: '$3',
  backgroundColor: '$backgroundHover',
  borderRadius: '$4',
  marginBottom: '$4',
})

const PlayerIndicator = styled(XStack, {
  alignItems: 'center',
  justifyContent: 'center',
  gap: '$2',
  padding: '$3',
  borderRadius: '$4',
  marginBottom: '$4',
  
  variants: {
    active: {
      true: {
        backgroundColor: '$primary',
      },
      false: {
        backgroundColor: '$backgroundHover',
      }
    },
    player: {
      X: {
        borderColor: '$playerX',
        borderWidth: 2,
      },
      O: {
        borderColor: '$playerO',
        borderWidth: 2,
      }
    }
  } as const,
})

const GameControls = styled(XStack, {
  justifyContent: 'space-around',
  gap: '$3',
  marginTop: '$4',
})

const GameOverContainer = styled(YStack, {
  alignItems: 'center',
  padding: '$6',
  backgroundColor: '$backgroundHover',
  borderRadius: '$6',
  gap: '$3',
  marginTop: '$4',
})

const aiPlayer = new AIPlayer('medium')

export const GameScreen: React.FC = () => {
  const {
    grid,
    gridSize,
    currentPlayer,
    gameState,
    winner,
    difficulty,
    score,
    currentGameScore,
    comboMultiplier,
    playerSymbol,
    aiSymbol,
    initializeGame,
    makeMove,
    setWinner,
    resetGame,
    updateScore,
    setDifficulty,
  } = useGameStore()

  // Initialize game on component mount
  useEffect(() => {
    if (gameState === 'notStarted') {
      initializeGame(3, difficulty)
    }
  }, [])

  // Update AI difficulty when game difficulty changes
  useEffect(() => {
    aiPlayer.setDifficulty(difficulty)
  }, [difficulty])

  // Handle AI moves
  useEffect(() => {
    if (gameState === 'playing' && currentPlayer === aiSymbol) {
      const timer = setTimeout(() => {
        makeAIMove()
      }, 1000) // 1 second delay for AI move

      return () => clearTimeout(timer)
    }
  }, [currentPlayer, gameState, grid])

  // Check for winner after each move
  useEffect(() => {
    const board = new Board(grid, gridSize)
    const gameWinner = board.getWinner()
    
    if (gameWinner && gameState === 'playing') {
      setWinner(gameWinner)
      
      // Calculate score based on game result
      if (gameWinner === playerSymbol) {
        updateScore(100) // Base win score
      } else if (gameWinner === 'DRAW') {
        updateScore(50) // Draw score
      }
    }
  }, [grid, gridSize, gameState])

  const makeAIMove = useCallback(() => {
    if (gameState !== 'playing' || currentPlayer !== aiSymbol) return

    const board = new Board(grid, gridSize)
    const move = aiPlayer.getMove(board, aiSymbol)
    
    if (move !== -1) {
      makeMove(move, aiSymbol)
    }
  }, [grid, gridSize, gameState, currentPlayer, aiSymbol])

  const handleCellPress = useCallback((index: number) => {
    if (gameState !== 'playing' || currentPlayer !== playerSymbol) return
    
    makeMove(index, playerSymbol)
  }, [gameState, currentPlayer, playerSymbol])

  const handleNewGame = () => {
    resetGame()
    initializeGame(gridSize, difficulty)
  }

  const handleDifficultyChange = (newDifficulty: typeof difficulty) => {
    setDifficulty(newDifficulty)
    if (gameState === 'notStarted') {
      initializeGame(gridSize, newDifficulty)
    }
  }

  const getGameStatusText = () => {
    if (gameState === 'finished') {
      if (winner === playerSymbol) return '🎉 Victory!'
      if (winner === aiSymbol) return '😔 Defeat'
      if (winner === 'DRAW') return '🤝 Draw'
    }
    
    if (currentPlayer === playerSymbol) return 'Your Turn'
    if (currentPlayer === aiSymbol) return 'AI Thinking...'
    
    return 'Ready to Play'
  }

  const getDifficultyColor = (diff: typeof difficulty) => {
    const colors = {
      easy: '$playerX',
      medium: '$accent',
      hard: '$playerO',
      expert: '$primary',
      master: '$secondary'
    }
    return colors[diff]
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScreenContainer>
        {/* Header */}
        <Header>
          <Text fontSize="$6" fontWeight="bold" color="$primary">
            Tatami Tactics
          </Text>
          <Text fontSize="$4" color="$color">
            Level {Math.floor((score.wins / 3) + 1)}
          </Text>
        </Header>

        {/* Score Display */}
        <ScoreContainer>
          <XStack gap="$4" alignItems="center">
            <YStack alignItems="center">
              <Text fontSize="$3" color="$color" opacity={0.7}>Wins</Text>
              <Text fontSize="$5" fontWeight="bold" color="$victory">{score.wins}</Text>
            </YStack>
            <YStack alignItems="center">
              <Text fontSize="$3" color="$color" opacity={0.7}>Score</Text>
              <Text fontSize="$5" fontWeight="bold" color="$accent">{score.totalScore}</Text>
            </YStack>
            <YStack alignItems="center">
              <Text fontSize="$3" color="$color" opacity={0.7}>Streak</Text>
              <Text fontSize="$5" fontWeight="bold" color="$primary">
                {comboMultiplier > 1 ? `${comboMultiplier.toFixed(1)}x` : '-'}
              </Text>
            </YStack>
          </XStack>
        </ScoreContainer>

        {/* Player Turn Indicator */}
        <PlayerIndicator 
          active={gameState === 'playing'}
          player={currentPlayer}
        >
          <Text fontSize="$4" fontWeight="bold" color="$color">
            {getGameStatusText()}
          </Text>
        </PlayerIndicator>

        {/* Game Board */}
        <Stack alignSelf="center">
          <GameBoard 
            onCellPress={handleCellPress}
            disabled={gameState === 'finished'}
          />
        </Stack>

        {/* Game Over Screen */}
        {gameState === 'finished' && (
          <GameOverContainer>
            <Text fontSize="$6" fontWeight="bold" color="$color">
              {getGameStatusText()}
            </Text>
            <Text fontSize="$4" color="$accent">
              +{currentGameScore} points
            </Text>
            <Button
              size="$4"
              backgroundColor="$primary"
              color="white"
              onPress={handleNewGame}
              pressStyle={{ scale: 0.95 }}
            >
              Play Again
            </Button>
          </GameOverContainer>
        )}

        {/* Game Controls */}
        <GameControls>
          <Button
            size="$3"
            variant="outlined"
            onPress={handleNewGame}
          >
            New Game
          </Button>
          
          {/* Difficulty Selector */}
          <XStack gap="$2">
            {(['easy', 'medium', 'hard'] as const).map((diff) => (
              <Button
                key={diff}
                size="$2"
                backgroundColor={difficulty === diff ? getDifficultyColor(diff) : '$backgroundHover'}
                color={difficulty === diff ? 'white' : '$color'}
                onPress={() => handleDifficultyChange(diff)}
                pressStyle={{ scale: 0.95 }}
              >
                {diff.charAt(0).toUpperCase() + diff.slice(1)}
              </Button>
            ))}
          </XStack>
        </GameControls>
      </ScreenContainer>
    </SafeAreaView>
  )
}