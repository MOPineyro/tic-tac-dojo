/**
 * This Api class lets you define an API endpoint and methods to request
 * data and process it.
 *
 * See the [Backend API Integration](https://docs.infinite.red/ignite-cli/boilerplate/app/services/#backend-api-integration)
 * documentation for more details.
 */
import { ApisauceInstance, create } from "apisauce"

import Config from "@/config"

import { getGeneralApiProblem } from "./apiProblem"
import type {
  ApiConfig,
  SessionCreateRequest,
  SessionResult,
  SessionResponse,
  GameCreationRequest,
  GameCreationResult,
  GameCreationResponse,
  GameMoveRequest,
  GameMoveResult,
  GameMoveResponse,
  GameStateResult,
  GameStateResponse,
  GameCompletionRequest,
  GameCompletionResult,
  GameCompletionResponse,
  PlayerProgressResult,
  PlayerProgressResponse,
  LevelUnlockRequest,
  LevelUnlockResult,
  LevelUnlockResponse,
  LeaderboardResult,
  LeaderboardResponse,
} from "./types"

/**
 * Configuring the apisauce instance.
 */
export const DEFAULT_API_CONFIG: ApiConfig = {
  url: Config.API_URL,
  timeout: 10000,
}

/**
 * Manages all requests to the API. You can use this class to build out
 * various requests that you need to call from your backend API.
 */
export class Api {
  apisauce: ApisauceInstance
  config: ApiConfig

  /**
   * Set up our API instance. Keep this lightweight!
   */
  constructor(config: ApiConfig = DEFAULT_API_CONFIG) {
    this.config = config
    this.apisauce = create({
      baseURL: this.config.url,
      timeout: this.config.timeout,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    })
  }

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  /**
   * Health check endpoint to verify API is running
   */
  async healthCheck() {
    const response = await this.apisauce.get("/api")

    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    return { kind: "ok", data: response.data as { message: string; timestamp: string } }
  }

  // ============================================================================
  // AUTHENTICATION & SESSION MANAGEMENT
  // ============================================================================

  /**
   * Create anonymous player session
   */
  async createSession(params: SessionCreateRequest = {}): Promise<SessionResult> {
    const response = await this.apisauce.post("/api/auth/session", params)

    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    return { kind: "ok", data: response.data as SessionResponse }
  }

  // ============================================================================
  // GAME MANAGEMENT
  // ============================================================================

  /**
   * Create a new game session
   */
  async createGame(params: GameCreationRequest): Promise<GameCreationResult> {
    const response = await this.apisauce.post("/api/game/create", params)

    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    return { kind: "ok", data: response.data as GameCreationResponse }
  }

  /**
   * Make a move in an active game
   * Note: In AI games, this automatically triggers AI response
   */
  async makeMove(params: GameMoveRequest): Promise<GameMoveResult> {
    const response = await this.apisauce.put("/api/game/move", params)

    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    return { kind: "ok", data: response.data as GameMoveResponse }
  }

  /**
   * Get current game state
   */
  async getGameState(gameId: string): Promise<GameStateResult> {
    const response = await this.apisauce.get(`/api/game/state/${gameId}`)

    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    return { kind: "ok", data: response.data as GameStateResponse }
  }

  /**
   * Complete a finished game and calculate score
   */
  async completeGame(params: GameCompletionRequest): Promise<GameCompletionResult> {
    const response = await this.apisauce.post("/api/game/complete", params)

    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    return { kind: "ok", data: response.data as GameCompletionResponse }
  }

  // ============================================================================
  // PLAYER MANAGEMENT
  // ============================================================================

  /**
   * Get player progress and statistics
   */
  async getPlayerProgress(playerId: string): Promise<PlayerProgressResult> {
    const response = await this.apisauce.get("/api/player/progress", { playerId })

    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    return { kind: "ok", data: response.data as PlayerProgressResponse }
  }

  /**
   * Unlock level with special code
   */
  async unlockLevel(params: LevelUnlockRequest): Promise<LevelUnlockResult> {
    const response = await this.apisauce.post("/api/player/progress", params)

    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    return { kind: "ok", data: response.data as LevelUnlockResponse }
  }

  // ============================================================================
  // LEADERBOARD
  // ============================================================================

  /**
   * Get global rankings
   */
  async getLeaderboard(
    params: {
      limit?: number
      offset?: number
    } = {},
  ): Promise<LeaderboardResult> {
    const response = await this.apisauce.get("/api/leaderboard/rankings", params)

    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    return { kind: "ok", data: response.data as LeaderboardResponse }
  }
}

// Singleton instance of the API for convenience
export const api = new Api()
