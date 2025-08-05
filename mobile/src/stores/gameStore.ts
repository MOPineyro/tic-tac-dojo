import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type Player = 'X' | 'O' | null
export type GameState = 'notStarted' | 'playing' | 'finished'
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'master'

export interface GameScore {
  wins: number
  losses: number
  draws: number
  totalScore: number
  highScore: number
  gamesPlayed: number
}

export interface PowerUp {
  id: string
  type: 'hint' | 'undo' | 'timeFreeze' | 'doubleScore'
  active: boolean
  uses: number
}

export interface GameStoreState {
  // Game state
  grid: Player[]
  gridSize: number
  currentPlayer: Player
  gameState: GameState
  winner: Player | 'DRAW' | null
  difficulty: Difficulty
  
  // Player info
  playerSymbol: Player
  aiSymbol: Player
  
  // Scoring and progression
  score: GameScore
  currentGameScore: number
  comboMultiplier: number
  consecutiveWins: number
  
  // Power-ups
  powerUps: PowerUp[]
  
  // Game timing
  gameStartTime: number | null
  moveStartTime: number | null
  totalGameTime: number
  
  // Level progression
  currentLevel: number
  levelProgress: { [level: number]: { wins: number; losses: number; draws: number; completed: boolean } }
  
  // Actions
  initializeGame: (gridSize?: number, difficulty?: Difficulty) => void
  makeMove: (index: number, player: Player) => void
  setWinner: (winner: Player | 'DRAW' | null) => void
  resetGame: () => void
  expandGrid: (newSize: number) => void
  activatePowerUp: (powerUpType: string) => void
  updateScore: (points: number) => void
  nextLevel: () => void
  setDifficulty: (difficulty: Difficulty) => void
}

export const useGameStore = create<GameStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      grid: Array(9).fill(null),
      gridSize: 3,
      currentPlayer: 'X',
      gameState: 'notStarted',
      winner: null,
      difficulty: 'medium',
      
      playerSymbol: 'X',
      aiSymbol: 'O',
      
      score: {
        wins: 0,
        losses: 0,
        draws: 0,
        totalScore: 0,
        highScore: 0,
        gamesPlayed: 0
      },
      currentGameScore: 0,
      comboMultiplier: 1,
      consecutiveWins: 0,
      
      powerUps: [
        { id: '1', type: 'hint', active: false, uses: 3 },
        { id: '2', type: 'undo', active: false, uses: 2 },
        { id: '3', type: 'timeFreeze', active: false, uses: 1 },
        { id: '4', type: 'doubleScore', active: false, uses: 1 },
      ],
      
      gameStartTime: null,
      moveStartTime: null,
      totalGameTime: 0,
      
      currentLevel: 1,
      levelProgress: {
        1: { wins: 0, losses: 0, draws: 0, completed: false },
        2: { wins: 0, losses: 0, draws: 0, completed: false },
        3: { wins: 0, losses: 0, draws: 0, completed: false },
        4: { wins: 0, losses: 0, draws: 0, completed: false },
        5: { wins: 0, losses: 0, draws: 0, completed: false },
      },
      
      // Actions
      initializeGame: (gridSize = 3, difficulty = 'medium') => set((state) => ({
        grid: Array(gridSize * gridSize).fill(null),
        gridSize,
        currentPlayer: 'X',
        gameState: 'playing',
        winner: null,
        difficulty,
        gameStartTime: Date.now(),
        moveStartTime: Date.now(),
        currentGameScore: 0,
      })),
      
      makeMove: (index, player) => set((state) => {
        if (state.grid[index] !== null || state.gameState !== 'playing') {
          return state // Invalid move
        }
        
        const newGrid = [...state.grid]
        newGrid[index] = player
        
        return {
          grid: newGrid,
          currentPlayer: player === 'X' ? 'O' : 'X',
          moveStartTime: Date.now(),
        }
      }),
      
      setWinner: (winner) => set((state) => {
        const gameEndTime = Date.now()
        const gameTime = state.gameStartTime ? gameEndTime - state.gameStartTime : 0
        
        let newScore = { ...state.score }
        let newConsecutiveWins = state.consecutiveWins
        let newComboMultiplier = state.comboMultiplier
        
        // Update stats based on winner
        if (winner === state.playerSymbol) {
          newScore.wins += 1
          newConsecutiveWins += 1
          newComboMultiplier = Math.min(5, 1 + (newConsecutiveWins * 0.2))
        } else if (winner === state.aiSymbol) {
          newScore.losses += 1
          newConsecutiveWins = 0
          newComboMultiplier = 1
        } else if (winner === 'DRAW') {
          newScore.draws += 1
          newConsecutiveWins = 0
          newComboMultiplier = 1
        }
        
        newScore.gamesPlayed += 1
        
        return {
          winner,
          gameState: 'finished',
          totalGameTime: gameTime,
          score: newScore,
          consecutiveWins: newConsecutiveWins,
          comboMultiplier: newComboMultiplier,
        }
      }),
      
      resetGame: () => set((state) => ({
        grid: Array(state.gridSize * state.gridSize).fill(null),
        currentPlayer: 'X',
        gameState: 'notStarted',
        winner: null,
        gameStartTime: null,
        moveStartTime: null,
        totalGameTime: 0,
        currentGameScore: 0,
      })),
      
      expandGrid: (newSize) => set({
        gridSize: newSize,
        grid: Array(newSize * newSize).fill(null),
        gameState: 'notStarted',
        winner: null,
      }),
      
      activatePowerUp: (powerUpType) => set((state) => ({
        powerUps: state.powerUps.map(powerUp =>
          powerUp.type === powerUpType && powerUp.uses > 0
            ? { ...powerUp, active: true, uses: powerUp.uses - 1 }
            : powerUp
        )
      })),
      
      updateScore: (points) => set((state) => {
        const newGameScore = state.currentGameScore + (points * state.comboMultiplier)
        const newTotalScore = state.score.totalScore + (points * state.comboMultiplier)
        const newHighScore = Math.max(state.score.highScore, newGameScore)
        
        return {
          currentGameScore: newGameScore,
          score: {
            ...state.score,
            totalScore: newTotalScore,
            highScore: newHighScore,
          }
        }
      }),
      
      nextLevel: () => set((state) => ({
        currentLevel: Math.min(5, state.currentLevel + 1),
      })),
      
      setDifficulty: (difficulty) => set({ difficulty }),
    }),
    {
      name: 'tatami-tactics-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        score: state.score,
        difficulty: state.difficulty,
        gridSize: state.gridSize,
        currentLevel: state.currentLevel,
        levelProgress: state.levelProgress,
        powerUps: state.powerUps.map(p => ({ ...p, active: false })), // Reset active states
      })
    }
  )
)