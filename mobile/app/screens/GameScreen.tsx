import { useState, useEffect } from "react"
import { StyleSheet, Pressable, View } from "react-native"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
} from "react-native-reanimated"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { AppStackScreenProps } from "@/navigators/AppNavigator"
import { useAppTheme } from "@/theme/context"
import { spacing } from "@/theme/spacing"

interface GameScreenProps extends AppStackScreenProps<"Game"> {}

type Player = "X" | "O" | null
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
  const { selectedCharacter, stage } = route.params

  // Game state
  const [grid, setGrid] = useState<Player[]>(Array(9).fill(null))
  const [currentPlayer, setCurrentPlayer] = useState<Player>("X")
  const [gameState, setGameState] = useState<GameState>("active")
  const [winner, setWinner] = useState<Player | "DRAW" | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(30)
  const [score, setScore] = useState(2450)

  // Opponent state
  const [opponent] = useState<OpponentState>(
    opponents[selectedCharacter as keyof typeof opponents] || opponents.samurai,
  )

  // Animations
  const opponentPulse = useSharedValue(1)
  const timerProgress = useSharedValue(1)
  const cellScales = Array.from({ length: 9 }, () => useSharedValue(1))

  useEffect(() => {
    // Opponent thinking animation
    if (currentPlayer === "O" && gameState === "active") {
      opponentPulse.value = withRepeat(withTiming(1.05, { duration: 1000 }), -1, true)
    } else {
      opponentPulse.value = withTiming(1)
    }
  }, [currentPlayer, gameState])

  useEffect(() => {
    // Timer countdown
    if (gameState === "active" && timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining((prev) => prev - 1)
        timerProgress.value = withTiming(timeRemaining / 30)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [timeRemaining, gameState])

  const opponentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: opponentPulse.value }],
  }))

  const timerAnimatedStyle = useAnimatedStyle(() => ({
    width: `${timerProgress.value * 100}%`,
    backgroundColor:
      timerProgress.value > 0.3 ? "#00FF88" : timerProgress.value > 0.1 ? "#FFD600" : "#FF006E",
  }))

  const handleCellPress = (index: number) => {
    if (grid[index] || currentPlayer !== "X" || gameState !== "active") return

    // Animate cell press
    cellScales[index].value = withSpring(0.9, {}, () => {
      cellScales[index].value = withSpring(1)
    })

    // Update grid
    const newGrid = [...grid]
    newGrid[index] = "X"
    setGrid(newGrid)

    // Check for winner
    const gameWinner = checkWinner(newGrid)
    if (gameWinner) {
      setWinner(gameWinner)
      setGameState("finished")
      setTimeout(() => {
        navigation.navigate(gameWinner === "X" ? "Win" : "Lose", {
          score: score + 100,
          timeUsed: 30 - timeRemaining,
          winner: gameWinner,
        })
      }, 1500)
      return
    }

    // Switch to AI turn
    setCurrentPlayer("O")
    setTimeRemaining(30)

    // Simulate AI move after delay
    setTimeout(() => {
      makeAIMove(newGrid)
    }, 1500)
  }

  const makeAIMove = (currentGrid: Player[]) => {
    const emptyCells = currentGrid
      .map((cell, index) => (cell === null ? index : null))
      .filter((index) => index !== null) as number[]

    if (emptyCells.length === 0) return

    // Simple random AI for demo
    const randomIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)]

    const newGrid = [...currentGrid]
    newGrid[randomIndex] = "O"
    setGrid(newGrid)

    // Animate AI move
    cellScales[randomIndex].value = withSpring(1.1, {}, () => {
      cellScales[randomIndex].value = withSpring(1)
    })

    // Check for winner
    const gameWinner = checkWinner(newGrid)
    if (gameWinner) {
      setWinner(gameWinner)
      setGameState("finished")
      setTimeout(() => {
        navigation.navigate(gameWinner === "X" ? "Win" : "Lose", {
          score: score,
          timeUsed: 30 - timeRemaining,
          winner: gameWinner,
        })
      }, 1500)
      return
    }

    // Switch back to player
    setCurrentPlayer("X")
    setTimeRemaining(30)
  }

  const checkWinner = (grid: Player[]): Player | "DRAW" | null => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8], // rows
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8], // columns
      [0, 4, 8],
      [2, 4, 6], // diagonals
    ]

    for (const [a, b, c] of lines) {
      if (grid[a] && grid[a] === grid[b] && grid[a] === grid[c]) {
        return grid[a]
      }
    }

    if (grid.every((cell) => cell !== null)) {
      return "DRAW"
    }

    return null
  }

  const GameCell = ({ index, value }: { index: number; value: Player }) => {
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: cellScales[index].value }],
    }))

    return (
      <Animated.View style={animatedStyle}>
        <Pressable
          style={[
            styles.gameCell,
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
            },
          ]}
          onPress={() => handleCellPress(index)}
          disabled={value !== null || currentPlayer !== "X"}
        >
          {value && <Text style={styles.cellText}>{value}</Text>}
        </Pressable>
      </Animated.View>
    )
  }

  return (
    <Screen
      preset="scroll"
      contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
      safeAreaEdges={["top", "bottom"]}
    >
      {/* Header with Score */}
      <View style={styles.headerSection}>
        <Text style={[styles.scoreText, { color: theme.colors.text }]}>
          Points: {score.toLocaleString()}
        </Text>
      </View>

      {/* Opponent Section */}
      <Animated.View style={[styles.opponentSection, opponentAnimatedStyle]}>
        <Text style={styles.opponentAvatar}>{opponent.avatar}</Text>
        <Text style={[styles.opponentName, { color: theme.colors.text }]} preset="subheading">
          {opponent.name}
        </Text>
        <Text style={[styles.opponentStatus, { color: theme.colors.textDim }]}>
          {currentPlayer === "O" ? "◯ " + opponent.expression : "◯ Waiting..."}
        </Text>
      </Animated.View>

      {/* Timer Section */}
      <View style={styles.timerSection}>
        <Text style={[styles.timerText, { color: theme.colors.text }]}>
          ⏱️ 0:{timeRemaining.toString().padStart(2, "0")}
        </Text>
        <View style={[styles.timerBar, { backgroundColor: theme.colors.border }]}>
          <Animated.View style={[styles.timerProgress, timerAnimatedStyle]} />
        </View>
      </View>

      {/* Game Board */}
      <View style={styles.boardSection}>
        <View style={styles.gameBoard}>
          {grid.map((cell, index) => (
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
                color: currentPlayer === "X" ? theme.colors.playerX : theme.colors.playerO,
                textShadowColor:
                  currentPlayer === "X" ? theme.colors.playerX : theme.colors.playerO,
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 8,
              },
            ]}
          >
            {currentPlayer === "X" ? "◉" : "◉"}
          </Text>
          <Text style={[styles.turnText, { color: theme.colors.text }]}>
            {currentPlayer === "X" ? "Your Turn" : "Opponent's Turn"}
          </Text>
        </View>
        <Text style={styles.playerAvatar}>{selectedCharacter === "samurai" ? "🛡️" : "🥷"}</Text>
        <Text style={[styles.playerName, { color: theme.colors.text }]}>You</Text>
      </View>
    </Screen>
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
  gameBoard: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    height: 240,
    width: 240,
  },
  gameCell: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 2,
    height: 76,
    justifyContent: "center",
    width: 76,
  },
  headerSection: {
    alignItems: "center",
    paddingBottom: spacing.sm,
    paddingTop: spacing.lg,
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
    marginRight: spacing.sm,
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
  },
  playerSection: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 80,
    overflow: "visible",
    paddingVertical: spacing.lg,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: "600",
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
})
