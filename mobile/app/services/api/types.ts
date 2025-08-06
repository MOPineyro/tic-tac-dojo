import { GeneralApiProblem } from "./apiProblem"

/**
 * The options used to configure apisauce.
 */
export interface ApiConfig {
  /**
   * The URL of the api.
   */
  url: string

  /**
   * Milliseconds before we timeout the request.
   */
  timeout: number
}

// Core Game Types
export type Player = "X" | "O"
export type GameState = "waiting" | "active" | "finished"
export type GameMode = "ai"
export type Difficulty = "easy" | "medium" | "hard" | "expert" | "master"
export type Grid = (Player | null)[]

// Request Types
export interface SessionCreateRequest {
  deviceId?: string
}

export interface GameCreationRequest {
  playerId: string
  level?: number
}

export interface GameMoveRequest {
  gameId: string
  playerId: string
  position: number
  player: Player
}

export interface GameCompletionRequest {
  gameId: string
  playerId: string
  finalGrid: Grid
}

export interface LevelUnlockRequest {
  playerId: string
  targetLevel: number
  unlockCode: string
}

// Response Types
export interface SessionResponse {
  success: boolean
  playerId: string
  playerData: PlayerData
}

export interface GameCreationResponse {
  success: boolean
  gameData: StandardGameState
  timer: TimerConfig
  levelInfo: LevelInfo
}

export interface GameMoveResponse {
  success: boolean
  gameState: StandardGameState
  moveResult: MoveResult
  aiMove?: AIMoveResult
}

export interface GameStateResponse {
  success: boolean
  gameState: StandardGameState
}

export interface GameCompletionResponse {
  success: boolean
  finalScore: number
  scoreBreakdown: ScoreBreakdown
  gameAnalysis: GameAnalysis
  playerUpdate: PlayerUpdate
  levelUp: boolean
}

export interface PlayerProgressResponse {
  success: boolean
  playerData: PlayerData
  levelDetails: LevelInfo
  statistics: PlayerStatistics
}

export interface LevelUnlockResponse {
  success: boolean
  unlockedLevel: number
  playerData: PlayerData
  message?: string
}

export interface LeaderboardResponse {
  success: boolean
  rankings: RankingEntry[]
  totalPlayers: number
  lastUpdated: string
}

// Complex Object Types
export interface StandardGameState {
  id: string
  grid: Grid
  gridSize: number
  currentPlayer: Player
  gameState: GameState
  winner?: Player | "DRAW" | null
  moveCount: number
  gameMode: GameMode
  difficulty?: Difficulty
  level: number
  levelName: string
  requiredWins: number
  totalTimeLimit: number
  moveTimeLimit: number
  timeRemaining: number
  lastMoveTime?: string
  startedAt: string
  finishedAt?: string | null
  finalized: boolean
  playerCount: number
}

export interface PlayerData {
  id: string
  playType: "anonymous"
  currentLevel: number
  levelProgress: Record<string, LevelProgress>
  totalScore: number
  achievements: string[]
  createdAt: string
  lastPlayed: string
}

export interface LevelProgress {
  wins: number
  losses: number
  draws: number
  requiredWins: number
  completed: boolean
}

export interface TimerConfig {
  totalTimeLimit: number
  moveTimeLimit: number
  warningThreshold: number
}

export interface LevelInfo {
  level: number
  name: string
  description: string
  requiredWins: number
  gridSize: number
  aiDepth: number
  optimalPlayPercentage: number
  aiStrategy: "basic" | "pattern" | "trap" | "defensive" | "psychological"
  behaviorDescription: string
}

export interface MoveResult {
  position: number
  player: Player
  winner?: Player | "DRAW" | null
  gameOver: boolean
}

export interface AIMoveResult {
  player: Player
  position: number
  moveNumber: number
}

export interface ScoreBreakdown {
  baseScore: number
  progressBonus: number
  timeBonus: number
  moveEfficiency: number
  nearWinBonus: number
  survivalBonus: number
  levelMultiplier: number
  totalScore: number
}

export interface GameAnalysis {
  strategicMoves: number
  threats: number
  nearWins: number
  survivalTime: number
  moveQuality: number
}

export interface PlayerUpdate {
  newTotalScore: number
  levelProgress: Record<string, LevelProgress>
  statsUpdate: {
    totalGames: number
    totalWins: number
    totalLosses: number
    totalDraws: number
    winRate: number
  }
}

export interface PlayerStatistics {
  totalGames: number
  totalWins: number
  totalLosses: number
  totalDraws: number
  winRate: number
  averageScore: number
  highestLevel: number
  achievements: string[]
}

export interface RankingEntry {
  rank: number
  playerId: string
  totalScore: number
  highestLevel: number
  totalGames: number
  winRate: number
  averageScore: number
  achievements: string[]
  levelProgress: Record<string, LevelProgress>
  lastPlayed: string
}

// API Result Types
export type SessionResult = { kind: "ok"; data: SessionResponse } | GeneralApiProblem
export type GameCreationResult = { kind: "ok"; data: GameCreationResponse } | GeneralApiProblem
export type GameMoveResult = { kind: "ok"; data: GameMoveResponse } | GeneralApiProblem
export type GameStateResult = { kind: "ok"; data: GameStateResponse } | GeneralApiProblem
export type GameCompletionResult = { kind: "ok"; data: GameCompletionResponse } | GeneralApiProblem
export type PlayerProgressResult = { kind: "ok"; data: PlayerProgressResponse } | GeneralApiProblem
export type LevelUnlockResult = { kind: "ok"; data: LevelUnlockResponse } | GeneralApiProblem
export type LeaderboardResult = { kind: "ok"; data: LeaderboardResponse } | GeneralApiProblem
