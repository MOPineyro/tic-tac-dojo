import { useState, useEffect } from "react"
import { StyleSheet, Pressable, View, Alert } from "react-native"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  runOnUI,
} from "react-native-reanimated"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { AppStackScreenProps } from "@/navigators/AppNavigator"
import type { StandardGameState, Player, Grid } from "@/services/api/types"
import { gameService } from "@/services/gameService"
import { useAppTheme } from "@/theme/context"
import { spacing } from "@/theme/spacing"

interface GameScreenProps extends AppStackScreenProps<"Game"> {}

type GameState = "active" | "finished"

interface OpponentState {
  id: string
  name: string
  avatar: string
  status: "thinking" | "waiting" | "confident" | "worried"
  expression: string
}

// Mock opponent data based on selected character
const opponents = {
  samurai: {
    id: "yuki",
    name: "Yuki the Novice",
    avatar: "😅",
    status: "thinking" as const,
    expression: "Hmm, let me think...",
  },
  ninja: {
    id: "kenji",
    name: "Kenji the Swift",
    avatar: "🤔",
    status: "thinking" as const,
    expression: "Analyzing the board...",
  },
}

export const GameScreen = ({ navigation, route }: GameScreenProps) => {
  const { theme } = useAppTheme()
  const { level, stage } = route.params

  // Real game state from API
  const [gameData, setGameData] = useState<StandardGameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI state
  const [gameState, setGameState] = useState<GameState>("active")
  const [localScore, setLocalScore] = useState(0)
  const [localTimeRemaining, setLocalTimeRemaining] = useState<number>(180)
  const [localMoveTimeRemaining, setLocalMoveTimeRemaining] = useState<number>(30)
  const [totalTimeLimit, setTotalTimeLimit] = useState<number>(180)
  const [moveTimeLimit, setMoveTimeLimit] = useState<number>(30)

  // Opponent state - will be set based on level
  const [opponent, setOpponent] = useState<OpponentState>(opponents.samurai)
  const [showLevelInfo, setShowLevelInfo] = useState(false)

  // Animations
  const opponentPulse = useSharedValue(1)
  const timerProgress = useSharedValue(1)
  const cellScales = Array.from({ length: 16 }, () => useSharedValue(1))

  // Pre-create animated styles for all cells (support up to 4x4 = 16 cells)
  const cellAnimatedStyles = [
    useAnimatedStyle(() => ({ transform: [{ scale: cellScales[0].value }] })),
    useAnimatedStyle(() => ({ transform: [{ scale: cellScales[1].value }] })),
    useAnimatedStyle(() => ({ transform: [{ scale: cellScales[2].value }] })),
    useAnimatedStyle(() => ({ transform: [{ scale: cellScales[3].value }] })),
    useAnimatedStyle(() => ({ transform: [{ scale: cellScales[4].value }] })),
    useAnimatedStyle(() => ({ transform: [{ scale: cellScales[5].value }] })),
    useAnimatedStyle(() => ({ transform: [{ scale: cellScales[6].value }] })),
    useAnimatedStyle(() => ({ transform: [{ scale: cellScales[7].value }] })),
    useAnimatedStyle(() => ({ transform: [{ scale: cellScales[8].value }] })),
    useAnimatedStyle(() => ({ transform: [{ scale: cellScales[9]?.value || 1 }] })),
    useAnimatedStyle(() => ({ transform: [{ scale: cellScales[10]?.value || 1 }] })),
    useAnimatedStyle(() => ({ transform: [{ scale: cellScales[11]?.value || 1 }] })),
    useAnimatedStyle(() => ({ transform: [{ scale: cellScales[12]?.value || 1 }] })),
    useAnimatedStyle(() => ({ transform: [{ scale: cellScales[13]?.value || 1 }] })),
    useAnimatedStyle(() => ({ transform: [{ scale: cellScales[14]?.value || 1 }] })),
    useAnimatedStyle(() => ({ transform: [{ scale: cellScales[15]?.value || 1 }] })),
  ]

  // Initialize game when component mounts
  useEffect(() => {
    initializeGame()
  }, [])

  const initializeGame = async () => {
    try {
      setLoading(true)
      setError(null)

      // Ensure we have a session
      let session = gameService.getCurrentSession()
      if (!session) {
        session = await gameService.initializeSession()
        if (!session) {
          setError("Failed to create game session")
          return
        }
      }

      // Create game with selected level
      const result = await gameService.createGameWithDetails(level)
      if (!result || !result.gameData) {
        setError("Failed to create game")
        return
      }

      const { gameData: newGameData, levelInfo } = result

      setGameData(newGameData)
      setGameState("active")
      setLocalScore(0)
      setLocalTimeRemaining(newGameData.timeRemaining || 180)
      setTotalTimeLimit(newGameData.totalTimeLimit || 180)
      setMoveTimeLimit(newGameData.moveTimeLimit || 30)
      setLocalMoveTimeRemaining(newGameData.moveTimeLimit || 30)

      // Set opponent based on level - each level has a unique emoji
      const levelEmojis: Record<number, string> = {
        1: "🥋", // White belt (Novice)
        2: "🎯", // Target (Apprentice)
        3: "⚔️", // Swords (Warrior)
        4: "🏯", // Castle (Strategist)
        5: "👑", // Crown (Master)
      }

      setOpponent({
        id: `level-${level}`,
        name: newGameData.levelName || `Level ${level}`,
        avatar: levelEmojis[level] || "🤖",
        status: "thinking" as const,
        expression: levelInfo?.behaviorDescription || "Analyzing the board...",
      })
    } catch (err) {
      setError(`Game initialization failed: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCellPress = async (index: number) => {
    if (!gameData || gameState !== "active" || loading) return

    // Check if move is valid
    if (!gameService.isValidMove(gameData.grid, index)) return

    // Optimistic update - immediately show player's move
    const optimisticGrid = [...gameData.grid]
    optimisticGrid[index] = "X"

    setGameData({
      ...gameData,
      grid: optimisticGrid,
      currentPlayer: "O", // Switch to opponent's turn
    })

    try {
      // Make move via API (includes AI response)
      const updatedGameData = await gameService.makeMove(index)

      if (updatedGameData) {
        // Check if the move was accepted (compare with our optimistic update)
        if (updatedGameData.grid[index] !== "X") {
          // Move was rejected, revert the optimistic update
          setGameData(gameData)
          setError("That position is already taken!")
          return
        }

        // Sync timer with backend
        if (updatedGameData.timeRemaining) {
          setLocalTimeRemaining(updatedGameData.timeRemaining)
        }

        // Reset move timer for next turn
        setLocalMoveTimeRemaining(moveTimeLimit)

        // If game is already finished after player move
        if (updatedGameData.gameState === "finished") {
          setGameData(updatedGameData)
          setGameState("finished")
          await handleGameComplete(updatedGameData)
        } else {
          // Add a delay before showing AI move for realistic feel
          // The server already made the AI move, but we'll delay showing it
          const aiMoveIndex = updatedGameData.grid.findIndex(
            (cell, i) => cell === "O" && gameData.grid[i] !== "O",
          )

          if (aiMoveIndex !== -1) {
            // Show the state before AI move temporarily
            const beforeAIMoveGrid = [...updatedGameData.grid]
            beforeAIMoveGrid[aiMoveIndex] = null

            setGameData({
              ...updatedGameData,
              grid: beforeAIMoveGrid,
              currentPlayer: "O",
            })

            // Delay then show AI move
            setTimeout(
              () => {
                setGameData(updatedGameData)

                // Animate the AI's move
                animateCellPress(aiMoveIndex)

                // Check if game finished after AI move
                if (updatedGameData.gameState === "finished") {
                  setGameState("finished")

                  // If AI won, add extra delay to see the winning move
                  if (updatedGameData.winner === "O") {
                    // Flash the winning cells
                    const winningLine = getWinningLine(updatedGameData.grid)
                    if (winningLine) {
                      animateWinningLine(winningLine)
                    }

                    // Delay before transitioning to lose screen
                    setTimeout(() => {
                      handleGameComplete(updatedGameData)
                    }, 1500) // 1.5 second delay to see the winning move
                  } else {
                    // Player won or draw, transition normally
                    handleGameComplete(updatedGameData)
                  }
                }
              },
              800 + Math.random() * 400,
            ) // 800-1200ms delay for realistic feel
          } else {
            // No AI move found, just update normally
            setGameData(updatedGameData)
          }
        }
      } else {
        // API call failed, revert optimistic update
        setGameData(gameData)
        setError("Failed to make move")
      }
    } catch (err) {
      // Error occurred, revert optimistic update
      setGameData(gameData)
      setError(`Move failed: ${err}`)
    }
  }

  const handleGameComplete = async (finalGameData: StandardGameState) => {
    try {
      console.log("Completing game with final state:", finalGameData)
      const gameResult = await gameService.completeGame()
      console.log("Game completion result:", gameResult)

      if (gameResult) {
        setLocalScore(gameResult.finalScore)

        // Calculate time used based on actual total time limit
        const timeUsed = totalTimeLimit - (finalGameData.timeRemaining || 0)

        // Check if this was a timeout (no moves made and time ran out)
        const isTimeout =
          finalGameData.moveCount === 0 &&
          (finalGameData.timeRemaining === 0 || finalGameData.winner === "O")

        // Navigate to appropriate result screen
        if (gameResult.winner === "X") {
          navigation.navigate("Win", {
            score: gameResult.finalScore,
            timeUsed: timeUsed,
            winner: "X",
          })
        } else if (gameResult.winner === "O" || isTimeout) {
          // AI win or timeout
          navigation.navigate("Lose", {
            score: gameResult.finalScore,
            timeUsed: timeUsed,
            winner: "O",
            level: level,
          })
        } else {
          // Draw - treated as a loss
          navigation.navigate("Lose", {
            score: gameResult.finalScore,
            timeUsed: timeUsed,
            winner: "DRAW",
            level: level,
          })
        }
      }
    } catch (err) {
      setError(`Game completion failed: ${err}`)
    }
  }

  useEffect(() => {
    // Opponent thinking animation - more pronounced when it's their turn
    requestAnimationFrame(() => {
      if (gameData?.currentPlayer === "O" && gameState === "active") {
        opponentPulse.value = withRepeat(
          withSequence(withTiming(1.08, { duration: 600 }), withTiming(1, { duration: 600 })),
          -1,
          false,
        )
      } else {
        opponentPulse.value = withTiming(1)
      }
    })
  }, [gameData?.currentPlayer, gameState])

  useEffect(() => {
    // Initialize local timer when game data is loaded
    if (gameData && gameData.timeRemaining) {
      setLocalTimeRemaining(gameData.timeRemaining)
    }
  }, [gameData?.timeRemaining])

  useEffect(() => {
    // Local timer countdown
    if (gameState === "active" && localTimeRemaining > 0) {
      const timer = setInterval(() => {
        setLocalTimeRemaining((prev) => {
          const newTime = Math.max(0, prev - 1)

          // Update timer progress bar
          requestAnimationFrame(() => {
            timerProgress.value = withTiming(newTime / totalTimeLimit, { duration: 900 })
          })

          // Check if time is up
          if (newTime === 0) {
            setGameState("finished")
            // Handle timeout - player loses
            // Use setTimeout to navigate after the current render
            setTimeout(() => {
              navigation.navigate("Lose", {
                score: localScore,
                timeUsed: totalTimeLimit,
                winner: "O",
                level: level,
              })
            }, 0)
          }

          return newTime
        })
      }, 1000)

      return () => clearInterval(timer)
    }

    // Always return a cleanup function, even if it's empty
    return () => {}
  }, [gameState, localTimeRemaining, localScore, navigation, totalTimeLimit])

  useEffect(() => {
    // Move timer countdown
    if (gameState === "active" && localMoveTimeRemaining > 0 && gameData?.currentPlayer === "X") {
      const moveTimer = setInterval(() => {
        setLocalMoveTimeRemaining((prev) => {
          const newTime = Math.max(0, prev - 1)

          // Check if move time is up
          if (newTime === 0 && gameState === "active") {
            // Player loses due to timeout
            setGameState("finished")
            // Navigate directly to lose screen without API call
            // Use setTimeout to navigate after the current render
            setTimeout(() => {
              navigation.navigate("Lose", {
                score: localScore,
                timeUsed: totalTimeLimit - localTimeRemaining,
                winner: "O",
                level: level,
              })
            }, 0)
          }

          return newTime
        })
      }, 1000)

      return () => clearInterval(moveTimer)
    }

    // Always return a cleanup function, even if it's empty
    return () => {}
  }, [
    gameState,
    localMoveTimeRemaining,
    gameData?.currentPlayer,
    localScore,
    navigation,
    totalTimeLimit,
    localTimeRemaining,
  ])

  const opponentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: opponentPulse.value }],
  }))

  const timerAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: `${timerProgress.value * 100}%`,
      backgroundColor:
        timerProgress.value > 0.5 ? "#00FF88" : timerProgress.value > 0.2 ? "#FFD600" : "#FF006E",
    }
  })

  // Animation helper for cell press
  const animateCellPress = (index: number) => {
    runOnUI(() => {
      cellScales[index].value = withSpring(0.9, {}, () => {
        cellScales[index].value = withSpring(1)
      })
    })()
  }

  // Get winning line indices
  const getWinningLine = (grid: Grid): number[] | null => {
    const gridSize = gameData?.gridSize || 3
    const lines: number[][] = []

    // Add rows
    for (let row = 0; row < gridSize; row++) {
      const rowLine: number[] = []
      for (let col = 0; col < gridSize; col++) {
        rowLine.push(row * gridSize + col)
      }
      lines.push(rowLine)
    }

    // Add columns
    for (let col = 0; col < gridSize; col++) {
      const colLine: number[] = []
      for (let row = 0; row < gridSize; row++) {
        colLine.push(row * gridSize + col)
      }
      lines.push(colLine)
    }

    // Add diagonals
    const diag1: number[] = []
    const diag2: number[] = []
    for (let i = 0; i < gridSize; i++) {
      diag1.push(i * gridSize + i)
      diag2.push(i * gridSize + (gridSize - 1 - i))
    }
    lines.push(diag1, diag2)

    // Check all lines for a winner
    for (const line of lines) {
      const firstCell = grid[line[0]]
      if (firstCell && line.every((index) => grid[index] === firstCell)) {
        return line
      }
    }
    return null
  }

  // Animate winning line
  const animateWinningLine = (indices: number[]) => {
    runOnUI(() => {
      indices.forEach((index, i) => {
        cellScales[index].value = withDelay(
          i * 100, // Stagger the animation
          withSequence(withSpring(1.2, { damping: 5 }), withSpring(1, { damping: 15 })),
        )
      })
    })()
  }

  // Error display component
  const renderError = () => {
    if (!error) return null

    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <Pressable style={styles.retryButton} onPress={initializeGame}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    )
  }

  // Loading display component
  const renderLoading = () => {
    if (!loading || gameData) return null

    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>🎮 Initializing game...</Text>
      </View>
    )
  }

  const GameCell = ({ index, value }: { index: number; value: Player | null }) => {
    const isWinningCell =
      gameState === "finished" && getWinningLine(gameData?.grid || [])?.includes(index)

    const handlePress = () => {
      animateCellPress(index)
      handleCellPress(index)
    }

    // Calculate exact cell size based on grid size and gaps
    const gridSize = gameData?.gridSize || 3
    const cellSize = gridSize === 4 ? 78 : 78 // 78px cells for both grids

    return (
      <Animated.View style={cellAnimatedStyles[index]}>
        <Pressable
          style={[
            styles.gameCell,
            {
              width: cellSize,
              height: cellSize,
            },
            {
              backgroundColor: value
                ? value === "X"
                  ? theme.colors.palette.neutral400
                  : theme.colors.palette.neutral400
                : theme.colors.surface,
              borderColor: value
                ? value === "X"
                  ? theme.colors.playerX
                  : theme.colors.playerO
                : theme.colors.border,
              borderWidth: isWinningCell ? 3 : 2,
            },
            isWinningCell && styles.winningCell,
          ]}
          onPress={handlePress}
          disabled={
            !gameData || gameState !== "active" || value !== null || gameData.currentPlayer !== "X"
          }
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
          android_ripple={{ color: theme.colors.border, borderless: false }}
        >
          {value && (
            <Text style={[styles.cellText, isWinningCell && styles.winningCellText]}>{value}</Text>
          )}
        </Pressable>
      </Animated.View>
    )
  }

  return (
    <>
      <Screen
        preset="scroll"
        contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
        safeAreaEdges={["top", "bottom"]}
      >
        {/* Show loading state */}
        {renderLoading()}

        {/* Show error state */}
        {renderError()}

        {/* Only show game when we have data and no error */}
        {gameData && !error && (
          <>
            {/* Opponent Section */}
            <Animated.View style={[styles.opponentSection, opponentAnimatedStyle]}>
              <Text style={styles.opponentAvatar}>{opponent.avatar}</Text>
              <View style={styles.opponentNameRow}>
                <Text
                  style={[styles.opponentName, { color: theme.colors.text }]}
                  preset="subheading"
                >
                  {opponent.name}
                </Text>
                <Pressable style={styles.infoButton} onPress={() => setShowLevelInfo(true)}>
                  <Text style={styles.infoIcon}>ℹ️</Text>
                </Pressable>
              </View>
              <Text style={[styles.opponentStatus, { color: theme.colors.textDim }]}>
                {gameData.currentPlayer === "O" ? "◯ Thinking..." : "◯ Waiting..."}
              </Text>
            </Animated.View>

            {/* Timer Section */}
            <View style={styles.timerSection}>
              <Text style={[styles.timerText, { color: theme.colors.text }]}>
                ⏱️ {Math.floor(localTimeRemaining / 60)}:
                {Math.floor(localTimeRemaining % 60)
                  .toString()
                  .padStart(2, "0")}
              </Text>
              <View style={[styles.timerBar, { backgroundColor: theme.colors.border }]}>
                <Animated.View style={[styles.timerProgress, timerAnimatedStyle]} />
              </View>

              {/* Move Timer */}
              <Text
                style={[
                  styles.moveTimerText,
                  {
                    color: localMoveTimeRemaining <= 10 ? "#FF006E" : theme.colors.textDim,
                    opacity: gameData?.currentPlayer === "X" ? 1 : 0,
                  },
                ]}
              >
                Move Time: {localMoveTimeRemaining}s
              </Text>
            </View>

            {/* Game Board */}
            <View style={styles.boardSection}>
              <View
                style={[
                  styles.gameBoard,
                  {
                    width: gameData.gridSize === 4 ? 320 : 240,
                    height: gameData.gridSize === 4 ? 320 : 240,
                  },
                ]}
              >
                {gameData.grid.map((cell, index) => (
                  <GameCell key={index} index={index} value={cell} />
                ))}
              </View>
            </View>

            {/* Player Section */}
            <View style={styles.playerSection}>
              <View style={styles.playerInfo}>
                <Text
                  style={[
                    styles.turnIndicator,
                    {
                      color:
                        gameData.currentPlayer === "X"
                          ? theme.colors.playerX
                          : theme.colors.playerO,
                      textShadowColor:
                        gameData.currentPlayer === "X"
                          ? theme.colors.playerX
                          : theme.colors.playerO,
                      textShadowOffset: { width: 0, height: 0 },
                      textShadowRadius: 8,
                    },
                  ]}
                >
                  {gameData.currentPlayer === "X" ? "◉" : "◉"}
                </Text>
                <Text style={[styles.turnText, { color: theme.colors.text }]}>
                  {gameData.currentPlayer === "X" ? "Your Turn" : "Opponent's Turn"}
                </Text>
              </View>
              <View style={styles.playerNameSection}>
                <Text style={styles.playerAvatar}>🛡️</Text>
                <Text style={[styles.playerName, { color: theme.colors.text }]}>You</Text>
                {/* <Text style={[styles.scoreText, { color: theme.colors.textDim }]}>
                  Points: {(localScore || 0).toLocaleString()}
                </Text> */}
              </View>
            </View>
          </>
        )}
      </Screen>

      {/* Level Info Modal */}
      {showLevelInfo && (
        <Pressable style={styles.modalOverlay} onPress={() => setShowLevelInfo(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]} preset="heading">
              {opponent.name}
            </Text>
            <Text style={styles.modalAvatar}>{opponent.avatar}</Text>
            <Text style={[styles.modalDescription, { color: theme.colors.textDim }]}>
              {opponent.expression}
            </Text>
            <Pressable
              style={[styles.modalButton, { backgroundColor: theme.colors.tint }]}
              onPress={() => setShowLevelInfo(false)}
            >
              <Text style={styles.modalButtonText}>Got it!</Text>
            </Pressable>
          </View>
        </Pressable>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  boardSection: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingVertical: spacing.lg,
  },
  cellText: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "bold",
    textShadowColor: "rgba(255, 255, 255, 0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  container: {
    minHeight: "100%",
    paddingHorizontal: spacing.lg,
  },
  errorContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  errorText: {
    color: "#FF006E",
    fontSize: 16,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  gameBoard: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2, // Small consistent gap
    height: 240,
    width: 240,
    alignItems: "flex-start",
    alignContent: "flex-start",
  },
  gameCell: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 2,
    height: 76,
    justifyContent: "center",
    width: 76,
  },

  infoButton: {
    marginLeft: spacing.xs,
    padding: spacing.xxs,
  },
  infoIcon: {
    fontSize: 18,
  },
  loadingContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  loadingText: {
    color: "#00FF88",
    fontSize: 18,
    fontWeight: "600",
  },
  modalAvatar: {
    fontSize: 80,
    lineHeight: 96,
    marginBottom: spacing.md,
    minHeight: 96,
    minWidth: 96,
    overflow: "visible",
    textAlign: "center",
  },
  modalButton: {
    borderRadius: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  modalContent: {
    alignItems: "center",
    borderRadius: spacing.md,
    elevation: 10,
    marginHorizontal: spacing.xl,
    padding: spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 1000,
  },
  modalTitle: {
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  moveTimerText: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: spacing.xs,
    textAlign: "center",
  },
  opponentAvatar: {
    fontSize: 60,
    lineHeight: 72,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  opponentName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  opponentNameRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  opponentSection: {
    alignItems: "center",
    minHeight: 140,
    overflow: "visible",
    paddingVertical: spacing.lg,
  },
  opponentStatus: {
    fontSize: 14,
    fontStyle: "italic",
  },
  playerAvatar: {
    fontSize: 40,
    lineHeight: 48,
    textAlign: "center",
  },
  playerInfo: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  playerNameSection: {
    alignItems: "center",
    justifyContent: "center",
  },
  playerSection: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 80,
    overflow: "visible",
    paddingVertical: spacing.lg,
  },
  retryButton: {
    backgroundColor: "#00AA44",
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  scoreText: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: spacing.xxs,
    textAlign: "center",
  },
  timerBar: {
    borderRadius: 2,
    height: 4,
    overflow: "hidden",
    width: "60%",
  },
  timerProgress: {
    borderRadius: 2,
    elevation: 4,
    height: "100%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  timerSection: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  timerText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  turnIndicator: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  turnText: {
    fontSize: 16,
    fontWeight: "600",
  },
  winningCell: {
    elevation: 10,
    shadowColor: "#FFD600",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  winningCellText: {
    color: "#FFD600",
    textShadowColor: "#FFD600",
    textShadowRadius: 20,
  },
})
