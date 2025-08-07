/**
 * Game Service - High-level interface for game operations
 *
 * This service wraps the low-level API calls and provides a cleaner interface
 * for the UI components to interact with the game backend.
 */
import { load, save, remove } from "@/utils/storage"

import { api } from "./api"
import type {
  Player,
  Grid,
  StandardGameState,
  ScoreBreakdown,
  GameAnalysis,
  PlayerUpdate,
  RankingEntry,
} from "./api/types"

// Storage keys
const STORAGE_KEYS = {
  SESSION: "tic-tac-dojo-session",
  PLAYER_ID: "tic-tac-dojo-player-id",
}

// Enhanced types for UI consumption
export interface GameSession {
  playerId: string
  gameId?: string
  currentGame?: StandardGameState
  playerData?: any
}

export interface GameResult {
  winner: Player | "DRAW" | null
  finalScore: number
  scoreBreakdown: ScoreBreakdown
  gameAnalysis: GameAnalysis
  playerUpdate: PlayerUpdate
  levelUp: boolean
}

export interface LevelData {
  level: number
  name: string
  description: string
  requiredWins: number
  unlocked: boolean
  completed: boolean
  progress: {
    wins: number
    losses: number
    draws: number
  }
}

/**
 * Game Service Class
 */
export class GameService {
  private currentSession: GameSession | null = null

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  /**
   * Initialize a player session
   */
  async initializeSession(deviceId?: string): Promise<GameSession | null> {
    try {
      // Check if we already have a session in memory
      if (this.currentSession) {
        console.log("Using existing session:", this.currentSession.playerId)
        return this.currentSession
      }

      // Try to load session from storage
      const savedPlayerId = await load(STORAGE_KEYS.PLAYER_ID)
      if (savedPlayerId) {
        console.log("Found saved player ID:", savedPlayerId)
        // Restore session with saved player ID
        this.currentSession = {
          playerId: savedPlayerId as string,
          playerData: undefined, // Will be loaded when needed
        }
        return this.currentSession
      }

      // No existing session, create a new one
      console.log("Creating new session with deviceId:", deviceId)

      const result = await api.createSession({ deviceId })

      console.log("Session creation result:", result)

      if (result.kind === "ok") {
        this.currentSession = {
          playerId: result.data.session.playerId,
          playerData: {
            id: result.data.session.playerId,
            playType: result.data.session.isAnonymous ? "anonymous" : "registered",
            currentLevel: 1, // Default level for new players
            levelProgress: [],
            totalScore: 0,
            achievements: [],
            createdAt: result.data.session.createdAt,
            lastPlayed: result.data.session.createdAt,
          },
        }

        // Save player ID for future sessions
        await save(STORAGE_KEYS.PLAYER_ID, result.data.session.playerId)

        console.log("Session created successfully:", this.currentSession)
        return this.currentSession
      }

      console.error("Failed to create session:", JSON.stringify(result, null, 2))
      return null
    } catch (error) {
      console.error("Session initialization error:", error)
      return null
    }
  }

  /**
   * Get current session
   */
  getCurrentSession(): GameSession | null {
    return this.currentSession
  }

  /**
   * Clear current session
   */
  async clearSession(): Promise<void> {
    this.currentSession = null
    await remove(STORAGE_KEYS.PLAYER_ID)
  }

  // ============================================================================
  // GAME OPERATIONS
  // ============================================================================

  /**
   * Create a new game
   */
  async createGame(level: number = 1): Promise<StandardGameState | null> {
    if (!this.currentSession) {
      console.error("No active session")
      return null
    }

    try {
      console.log("Creating game with params:", {
        playerId: this.currentSession.playerId,
        level,
      })

      const result = await api.createGame({
        playerId: this.currentSession.playerId,
        level,
      })

      console.log("Game creation result:", result)

      if (result.kind === "ok") {
        const gameState = result.data.gameData
        this.currentSession.gameId = gameState.id
        this.currentSession.currentGame = gameState
        return gameState
      }

      console.error("Failed to create game:", JSON.stringify(result, null, 2))
      return null
    } catch (error) {
      console.error("Game creation error:", error)
      return null
    }
  }

  /**
   * Create a new game and return full details including level info
   */
  async createGameWithDetails(level: number = 1): Promise<any | null> {
    if (!this.currentSession) {
      console.error("No active session")
      return null
    }

    try {
      const result = await api.createGame({
        playerId: this.currentSession.playerId,
        level,
      })

      if (result.kind === "ok") {
        const gameState = result.data.gameData
        this.currentSession.gameId = result.data.gameId
        this.currentSession.currentGame = gameState
        return {
          gameData: gameState,
          levelInfo: result.data.levelInfo,
          timer: result.data.timer,
        }
      }

      console.error("Failed to create game:", JSON.stringify(result, null, 2))
      return null
    } catch (error) {
      console.error("Game creation error:", error)
      return null
    }
  }

  /**
   * Make a move in the current game
   * Returns the game state if successful, or throws an error with timeout info
   */
  async makeMove(position: number): Promise<StandardGameState | null> {
    if (!this.currentSession?.gameId || !this.currentSession.currentGame) {
      console.error("No active game")
      return null
    }

    try {
      const result = await api.makeMove({
        gameId: this.currentSession.gameId,
        playerId: this.currentSession.playerId,
        position,
        player: "X", // Player is always X
      })

      if (result.kind === "ok") {
        const gameState = result.data.gameState
        this.currentSession.currentGame = gameState
        return gameState
      }

      console.error("Failed to make move:", result)
      return null
    } catch (error) {
      console.error("Move error:", error)
      return null
    }
  }

  /**
   * Complete the current game
   */
  async completeGame(): Promise<GameResult | null> {
    if (!this.currentSession?.gameId || !this.currentSession.currentGame) {
      console.error("No active game to complete")
      return null
    }

    try {
      const result = await api.completeGame({
        gameId: this.currentSession.gameId,
        playerId: this.currentSession.playerId,
        finalGrid: this.currentSession.currentGame.grid,
      })

      if (result.kind === "ok" && result.data.success) {
        const gameResult: GameResult = {
          winner: result.data.result.winner || null,
          finalScore: result.data.result.score,
          scoreBreakdown: result.data.result.scoreBreakdown,
          gameAnalysis: result.data.result.gameAnalysis,
          playerUpdate: result.data.player,
          levelUp: result.data.result.levelUp,
        }

        // Clear current game
        this.currentSession.gameId = undefined
        this.currentSession.currentGame = undefined

        return gameResult
      }

      console.error("Failed to complete game:", result)
      return null
    } catch (error) {
      console.error("Game completion error:", error)
      return null
    }
  }

  /**
   * Get current game state
   */
  getCurrentGame(): StandardGameState | null {
    return this.currentSession?.currentGame || null
  }

  // ============================================================================
  // PLAYER PROGRESS
  // ============================================================================

  /**
   * Get player progress and statistics
   */
  async getPlayerProgress(): Promise<any | null> {
    if (!this.currentSession) {
      console.error("No active session")
      return null
    }

    try {
      const result = await api.getPlayerProgress(this.currentSession.playerId)
      console.log("Raw player progress API response:", result)

      if (result.kind === "ok" && result.data.success) {
        // Return the actual API response structure
        return result.data
      }

      console.error("Failed to get player progress:", result)
      return null
    } catch (error) {
      console.error("Player progress error:", error)
      return null
    }
  }

  /**
   * Get available levels with unlock status
   */
  async getAvailableLevels(): Promise<LevelData[]> {
    const progress = await this.getPlayerProgress()
    if (!progress) return []

    const levels: LevelData[] = []
    const currentLevel = progress.playerData.currentLevel
    const levelProgress = progress.playerData.levelProgress

    // Create level data for levels 1-5
    for (let i = 1; i <= 5; i++) {
      const progressData = levelProgress[i.toString()] || {
        wins: 0,
        losses: 0,
        draws: 0,
        requiredWins: 3,
        completed: false,
      }

      levels.push({
        level: i,
        name: this.getLevelName(i),
        description: this.getLevelDescription(i),
        requiredWins: progressData.requiredWins,
        unlocked: i <= currentLevel,
        completed: progressData.completed,
        progress: {
          wins: progressData.wins,
          losses: progressData.losses,
          draws: progressData.draws,
        },
      })
    }

    return levels
  }

  // ============================================================================
  // LEADERBOARD
  // ============================================================================

  /**
   * Get global leaderboard
   */
  async getLeaderboard(limit: number = 10, offset: number = 0): Promise<RankingEntry[]> {
    try {
      const result = await api.getLeaderboard({ limit, offset })

      if (result.kind === "ok") {
        return result.data.rankings
      }

      console.error("Failed to get leaderboard:", result)
      return []
    } catch (error) {
      console.error("Leaderboard error:", error)
      return []
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private getLevelName(level: number): string {
    const names = {
      1: "Novice",
      2: "Student",
      3: "Apprentice",
      4: "Expert",
      5: "Master",
    }
    return names[level as keyof typeof names] || "Unknown"
  }

  private getLevelDescription(level: number): string {
    const descriptions = {
      1: "Basic AI that makes random moves most of the time",
      2: "AI with pattern recognition capabilities",
      3: "AI that can set traps and think ahead",
      4: "Defensive AI master with strategic depth",
      5: "Ultimate AI with psychological warfare tactics",
    }
    return descriptions[level as keyof typeof descriptions] || "Unknown level"
  }

  /**
   * Check if a move is valid
   */
  isValidMove(grid: Grid, position: number): boolean {
    return position >= 0 && position < 9 && grid[position] === null
  }

  /**
   * Unlock level with code
   */
  async unlockLevel(level: number, unlockCode: string): Promise<any | null> {
    if (!this.currentSession) {
      console.error("No active session")
      return null
    }

    try {
      const result = await api.unlockLevel({
        playerId: this.currentSession.playerId,
        targetLevel: level,
        unlockCode: unlockCode,
      })

      if (result.kind === "ok") {
        console.log("Level unlock successful:", result.data)
        return result.data
      }

      console.error("Failed to unlock level:", JSON.stringify(result, null, 2))
      return null
    } catch (error) {
      console.error("Level unlock error:", error)
      return null
    }
  }

  /**
   * Check for winner in grid
   */
  checkWinner(grid: Grid): Player | "DRAW" | null {
    // Check rows
    for (let i = 0; i < 9; i += 3) {
      if (grid[i] && grid[i] === grid[i + 1] && grid[i] === grid[i + 2]) {
        return grid[i] as Player
      }
    }

    // Check columns
    for (let i = 0; i < 3; i++) {
      if (grid[i] && grid[i] === grid[i + 3] && grid[i] === grid[i + 6]) {
        return grid[i] as Player
      }
    }

    // Check diagonals
    if (grid[0] && grid[0] === grid[4] && grid[0] === grid[8]) {
      return grid[0] as Player
    }
    if (grid[2] && grid[2] === grid[4] && grid[2] === grid[6]) {
      return grid[2] as Player
    }

    // Check for draw
    if (grid.every((cell) => cell !== null)) {
      return "DRAW"
    }

    return null
  }
}

// Singleton instance
export const gameService = new GameService()
