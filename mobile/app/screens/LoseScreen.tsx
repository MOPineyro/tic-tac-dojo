import { useEffect } from "react"
import { StyleSheet, Pressable, View } from "react-native"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
} from "react-native-reanimated"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { AppStackScreenProps } from "@/navigators/AppNavigator"
import { useAppTheme } from "@/theme/context"
import { spacing } from "@/theme/spacing"

interface LoseScreenProps extends AppStackScreenProps<"Lose"> {}

export const LoseScreen = ({ navigation, route }: LoseScreenProps) => {
  const { theme } = useAppTheme()
  const { score = 0, timeUsed = 0, winner, level } = route.params

  // Calculate consolation score for good effort
  const consolationScore = Math.max(50, Math.floor(score * 0.3))
  const movesAnalyzed = Math.floor(Math.random() * 8) + 7 // Mock moves count

  // Animation values
  const shakeX = useSharedValue(0)
  const fadeOpacity = useSharedValue(1)
  const resultScale = useSharedValue(0)
  const heartScale = useSharedValue(0)
  const buttonTranslateY = useSharedValue(50)
  const buttonOpacity = useSharedValue(0)

  useEffect(() => {
    // Defeat animation sequence
    const startAnimations = () => {
      // Screen shake effect
      shakeX.value = withSequence(
        withTiming(-10, { duration: 100 }),
        withTiming(10, { duration: 100 }),
        withTiming(-5, { duration: 100 }),
        withTiming(5, { duration: 100 }),
        withTiming(0, { duration: 100 }),
      )

      // Grayscale transition effect (simulated with opacity)
      fadeOpacity.value = withTiming(0.8, { duration: 500 })

      // Result text
      resultScale.value = withDelay(300, withSpring(1, { damping: 15 }))

      // Broken heart
      heartScale.value = withDelay(600, withSpring(1, { damping: 10 }))

      // Buttons
      buttonTranslateY.value = withDelay(1000, withSpring(0))
      buttonOpacity.value = withDelay(1000, withTiming(1))
    }

    startAnimations()
  }, [])

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
    opacity: fadeOpacity.value,
  }))

  const resultAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: resultScale.value }],
  }))

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }))

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: buttonTranslateY.value }],
    opacity: buttonOpacity.value,
  }))

  const handleTryAgain = () => {
    // If we know the level, go directly to the game, otherwise go to stage select
    if (level) {
      navigation.navigate("Game", {
        level: level,
        stage: { level: level }, // Basic stage info
      })
    } else {
      navigation.navigate("StageSelect")
    }
  }

  const handleMainMenu = () => {
    // Main menu is the stage select screen
    navigation.navigate("StageSelect")
  }

  const getEncouragementMessage = () => {
    if (winner === "DRAW") {
      return "It's a draw! You matched the AI's skill. Try to find the winning edge!"
    } else if (timeUsed < 20) {
      return "You played fast! Try a more defensive strategy."
    } else if (movesAnalyzed > 12) {
      return "Good strategic thinking! You were close to victory."
    } else {
      return "Every defeat is a lesson. You'll get them next time!"
    }
  }

  return (
    <Screen
      preset="scroll"
      contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
      safeAreaEdges={["top", "bottom"]}
    >
      <Animated.View style={[styles.content, containerAnimatedStyle]}>
        {/* Result Section - 30% */}
        <View style={styles.resultSection}>
          <Animated.View style={resultAnimatedStyle}>
            <Text style={[styles.defeatText, { color: "#EF4444" }]} preset="heading">
              {winner === "DRAW" ? "DRAW" : "DEFEATED"}
            </Text>
          </Animated.View>

          <Animated.View style={heartAnimatedStyle}>
            <Text style={styles.heartEmoji}>{winner === "DRAW" ? "🤝" : "💔"}</Text>
          </Animated.View>
        </View>

        {/* Stats Section - 30% */}
        <View style={styles.statsSection}>
          <View style={styles.statsContainer}>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: theme.colors.text }]}>Score Earned:</Text>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {consolationScore}
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: theme.colors.text }]}>Moves Played:</Text>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{movesAnalyzed}</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: theme.colors.text }]}>Time Played:</Text>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{timeUsed}s</Text>
            </View>
          </View>

          <View style={styles.encouragementContainer}>
            <Text style={[styles.encouragementText, { color: "#F59E0B" }]}>
              {winner === "DRAW"
                ? "A draw is still a lesson. Victory requires decisive action."
                : "The way of the warrior is found in death. Defeat teaches wisdom."}
            </Text>
            <Text style={[styles.hintText, { color: theme.colors.textDim }]}>
              {getEncouragementMessage()}
            </Text>
          </View>
        </View>

        {/* Actions Section - 40% */}
        <Animated.View style={[styles.actionsSection, buttonAnimatedStyle]}>
          <Pressable style={styles.retryButton} onPress={handleTryAgain}>
            <Text style={styles.retryButtonText}>TRY AGAIN</Text>
          </Pressable>

          <Pressable style={styles.menuButton} onPress={handleMainMenu}>
            <Text style={styles.menuButtonText}>MAIN MENU</Text>
          </Pressable>

          {/* Leaderboard temporarily disabled
          <Pressable
            style={styles.leaderboardLink}
            onPress={() => navigation.navigate("Leaderboard")}
          >
            <Text style={styles.leaderboardText}>🏆 View Leaderboard</Text>
          </Pressable>
          */}

          {/* Lives remaining indicator */}
          <View style={styles.livesContainer}>
            <Text style={[styles.livesText, { color: theme.colors.textDim }]}>
              Lives remaining: ⚔️ ⚔️ ⚔️
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  actionsSection: {
    flex: 0.4,
    gap: spacing.md,
    justifyContent: "center",
  },
  container: {
    minHeight: "100%",
    paddingHorizontal: spacing.lg,
  },
  content: {
    flex: 1,
  },
  defeatText: {
    fontSize: 42,
    fontWeight: "bold",
    marginBottom: spacing.lg,
    textAlign: "center",
    textShadowColor: "rgba(239, 68, 68, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  encouragementContainer: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  encouragementText: {
    fontSize: 16,
    fontStyle: "italic",
    fontWeight: "600",
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  heartEmoji: {
    fontSize: 64,
    lineHeight: 76,
    textAlign: "center",
  },
  hintText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  leaderboardLink: {
    alignItems: "center",
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  leaderboardText: {
    color: "#00AA44",
    fontSize: 14,
    fontWeight: "500",
    opacity: 0.8,
  },
  livesContainer: {
    alignItems: "center",
    marginTop: spacing.sm,
  },
  livesText: {
    fontSize: 14,
  },
  menuButton: {
    alignItems: "center",
    backgroundColor: "transparent", // No background for outline style
    borderColor: "#00AA44", // Green outline
    borderRadius: 8,
    borderWidth: 2,
    elevation: 2, // Minimal elevation
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    // Subtle shadow for outline button
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  menuButtonText: {
    color: "#00FF88", // Green text to match outline
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
    textShadowColor: "#000000", // Black shadow for readability
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  resultSection: {
    alignItems: "center",
    flex: 0.3,
    justifyContent: "center",
    paddingTop: spacing.xl,
  },
  retryButton: {
    alignItems: "center",
    backgroundColor: "#00AA44", // Rich green base
    borderRadius: 8, // Less rounded, more squarish
    elevation: 8,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    // Skeumorphic beveled effect
    borderTopColor: "#00FF88", // Light green highlight
    borderTopWidth: 3,
    borderLeftColor: "#00FF88", // Light green highlight
    borderLeftWidth: 3,
    borderRightColor: "#006622", // Dark green shadow
    borderRightWidth: 3,
    borderBottomColor: "#006622", // Dark green shadow
    borderBottomWidth: 3,
    // Drop shadow for depth
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  retryButtonText: {
    color: "#FFFFFF", // White text for contrast
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
    textShadowColor: "#003311", // Dark green shadow for depth
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  retrySubtext: {
    color: "#E0FFE0", // Light green tint for Japanese text
    fontSize: 12,
    marginTop: 2,
    opacity: 0.95,
    textShadowColor: "#003311", // Dark green shadow for depth
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  statLabel: {
    fontSize: 16,
  },
  statRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  statsContainer: {
    marginBottom: spacing.lg,
  },
  statsSection: {
    flex: 0.3,
    justifyContent: "center",
    paddingVertical: spacing.lg,
  },
})
