/**
 * API Test utilities for verifying backend connection
 */
import { api } from "./api"
import { gameService } from "./gameService"

export interface ApiTestResult {
  success: boolean
  message: string
  details?: any
  error?: string
}

export class ApiTester {
  /**
   * Test health check endpoint
   */
  static async testHealthCheck(): Promise<ApiTestResult> {
    try {
      const result = await api.healthCheck()

      if (result.kind === "ok") {
        return {
          success: true,
          message: "Health check successful",
          details: result.data,
        }
      } else {
        return {
          success: false,
          message: "Health check failed",
          error: result.kind,
        }
      }
    } catch (error) {
      return {
        success: false,
        message: "Health check error",
        error: String(error),
      }
    }
  }

  /**
   * Test session creation
   */
  static async testSessionCreation(): Promise<ApiTestResult> {
    try {
      const session = await gameService.initializeSession("test_device")

      if (session) {
        return {
          success: true,
          message: "Session created successfully",
          details: {
            playerId: session.playerId,
            playerData: session.playerData,
          },
        }
      } else {
        return {
          success: false,
          message: "Session creation failed",
          error: "No session returned",
        }
      }
    } catch (error) {
      return {
        success: false,
        message: "Session creation error",
        error: String(error),
      }
    }
  }

  /**
   * Test game creation
   */
  static async testGameCreation(): Promise<ApiTestResult> {
    try {
      // First ensure we have a session
      console.log("🧪 Testing session creation...")
      const session = await gameService.initializeSession("test_device")
      if (!session) {
        return {
          success: false,
          message: "Could not create session for game test",
          error: "Session initialization failed",
        }
      }
      console.log("✅ Session created:", session.playerId)

      // Create a game
      console.log("🧪 Testing game creation...")
      const gameState = await gameService.createGame(1)

      if (gameState) {
        console.log("✅ Game created:", gameState.id)
        return {
          success: true,
          message: "Game created successfully",
          details: {
            gameId: gameState.id,
            level: gameState.level,
            grid: gameState.grid,
            currentPlayer: gameState.currentPlayer,
          },
        }
      } else {
        console.log("❌ Game creation failed - check console for details")
        return {
          success: false,
          message: "Game creation failed",
          error: "No game state returned - check console for detailed error logs",
        }
      }
    } catch (error) {
      return {
        success: false,
        message: "Game creation error",
        error: String(error),
      }
    }
  }

  /**
   * Test leaderboard fetch
   */
  static async testLeaderboard(): Promise<ApiTestResult> {
    try {
      const rankings = await gameService.getLeaderboard(5)

      return {
        success: true,
        message: "Leaderboard fetched successfully",
        details: {
          count: rankings.length,
          topPlayer: rankings[0] || null,
        },
      }
    } catch (error) {
      return {
        success: false,
        message: "Leaderboard fetch error",
        error: String(error),
      }
    }
  }

  /**
   * Run a comprehensive API test suite
   */
  static async runFullTest(): Promise<{
    overall: boolean
    results: Record<string, ApiTestResult>
  }> {
    const results: Record<string, ApiTestResult> = {}

    console.log("🧪 Running API Test Suite...")

    // Test 1: Health Check
    console.log("1. Testing health check...")
    results.healthCheck = await this.testHealthCheck()
    console.log(
      results.healthCheck.success ? "✅ Health check passed" : "❌ Health check failed",
      results.healthCheck.message,
    )

    // Test 2: Session Creation
    console.log("2. Testing session creation...")
    results.sessionCreation = await this.testSessionCreation()
    console.log(
      results.sessionCreation.success ? "✅ Session creation passed" : "❌ Session creation failed",
      results.sessionCreation.message,
    )

    // Test 3: Game Creation (only if session works)
    if (results.sessionCreation.success) {
      console.log("3. Testing game creation...")
      results.gameCreation = await this.testGameCreation()
      console.log(
        results.gameCreation.success ? "✅ Game creation passed" : "❌ Game creation failed",
        results.gameCreation.message,
      )
    } else {
      results.gameCreation = {
        success: false,
        message: "Skipped due to session creation failure",
      }
    }

    // Test 4: Leaderboard
    console.log("4. Testing leaderboard...")
    results.leaderboard = await this.testLeaderboard()
    console.log(
      results.leaderboard.success ? "✅ Leaderboard passed" : "❌ Leaderboard failed",
      results.leaderboard.message,
    )

    // Overall result
    const overall = Object.values(results).every((result) => result.success)
    console.log(overall ? "🎉 All tests passed!" : "⚠️ Some tests failed")

    return { overall, results }
  }
}

// Export convenience function
export const runApiTest = ApiTester.runFullTest
