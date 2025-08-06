import { useEffect } from "react"
import { StyleSheet, Pressable, View } from "react-native"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
} from "react-native-reanimated"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import { AppStackScreenProps } from "@/navigators/AppNavigator"
import { spacing } from "@/theme/spacing"

interface WinScreenProps extends AppStackScreenProps<"Win"> {}

interface ScoreBreakdown {
  baseScore: number
  timeBonus: number
  perfectBonus?: number
  totalScore: number
}

export const WinScreen = ({ navigation, route }: WinScreenProps) => {
  const { theme } = useAppTheme()
  const { score = 0, timeUsed = 0, winner } = route.params

  // Mock score breakdown calculation
  const scoreBreakdown: ScoreBreakdown = {
    baseScore: 100,
    timeBonus: Math.max(0, (30 - timeUsed) * 5),
    perfectBonus: timeUsed < 15 ? 50 : undefined,
    totalScore: score + 100 + Math.max(0, (30 - timeUsed) * 5) + (timeUsed < 15 ? 50 : 0)
  }

  // Animation values
  const burstScale = useSharedValue(0)
  const burstOpacity = useSharedValue(0)
  const resultScale = useSharedValue(0)
  const starsScale = useSharedValue(0)
  const scoreCountUp = useSharedValue(0)
  const buttonTranslateY = useSharedValue(50)
  const buttonOpacity = useSharedValue(0)

  useEffect(() => {
    // Victory animation sequence
    const startAnimations = () => {
      // Burst effect
      burstOpacity.value = withTiming(1, { duration: 300 })
      burstScale.value = withSequence(
        withTiming(1.5, { duration: 300 }),
        withTiming(1, { duration: 200 })
      )

      // Result text
      resultScale.value = withDelay(200, withSpring(1, { damping: 15 }))

      // Stars
      starsScale.value = withDelay(500, withSpring(1, { damping: 10 }))

      // Score count up
      scoreCountUp.value = withDelay(800, withTiming(scoreBreakdown.totalScore, { 
        duration: 1500 
      }))

      // Buttons
      buttonTranslateY.value = withDelay(1200, withSpring(0))
      buttonOpacity.value = withDelay(1200, withTiming(1))
    }

    startAnimations()
  }, [])

  const burstAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: burstScale.value }],
    opacity: burstOpacity.value,
  }))

  const resultAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: resultScale.value }],
  }))

  const starsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: starsScale.value }],
  }))

  const scoreAnimatedStyle = useAnimatedStyle(() => ({
    // Using interpolate for count up effect would be more complex
    // For now, we'll use a simpler approach
  }))

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: buttonTranslateY.value }],
    opacity: buttonOpacity.value,
  }))

  const handleContinue = () => {
    // Reset animations and navigate
    navigation.navigate("StageSelect", { selectedCharacter: "samurai" })
  }

  const handleMainMenu = () => {
    navigation.navigate("Welcome")
  }

  const renderStars = () => {
    // Calculate stars based on performance
    const stars = timeUsed < 10 ? 3 : timeUsed < 20 ? 2 : 1
    
    return (
      <Animated.View style={[styles.starsContainer, starsAnimatedStyle]}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Text
            key={index}
            style={[
              styles.star,
              { opacity: index < stars ? 1 : 0.3 }
            ]}
          >
            ⭐
          </Text>
        ))}
      </Animated.View>
    )
  }

  return (
    <Screen 
      preset="scroll"
      contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
      safeAreaEdges={["top", "bottom"]}
    >
      {/* Result Section */}
      <View style={styles.resultSection}>
        {/* Burst Effect */}
        <Animated.View style={[styles.burstEffect, burstAnimatedStyle]}>
          <Text style={styles.burstEmoji}>🎆</Text>
        </Animated.View>
        <Animated.View style={resultAnimatedStyle}>
          <Text
            style={[styles.victoryText, { color: "#F59E0B" }]}
            preset="heading"
          >
            VICTORY!
          </Text>
        </Animated.View>
        
        {renderStars()}
      </View>

      {/* Stats Section - 30% */}
      <View style={styles.statsSection}>
        <View style={styles.scoreBreakdownContainer}>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreLabel, { color: theme.colors.text }]}>
              Base Score:
            </Text>
            <Text style={[styles.scoreValue, { color: theme.colors.text }]}>
              {scoreBreakdown.baseScore}
            </Text>
          </View>
          
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreLabel, { color: theme.colors.text }]}>
              Time Bonus:
            </Text>
            <Text style={[styles.scoreValue, { color: "#10B981" }]}>
              +{scoreBreakdown.timeBonus}
            </Text>
          </View>

          {scoreBreakdown.perfectBonus && (
            <View style={styles.scoreRow}>
              <Text style={[styles.scoreLabel, { color: theme.colors.text }]}>
                Perfect Clear!
              </Text>
              <Text style={[styles.scoreValue, { color: "#F59E0B" }]}>
                +{scoreBreakdown.perfectBonus}
              </Text>
            </View>
          )}

          <View style={[styles.scoreRow, styles.totalRow]}>
            <Text style={[styles.totalLabel, { color: theme.colors.text }]}>
              Total Score:
            </Text>
            <Text style={[styles.totalValue, { color: "#F59E0B" }]}>
              {scoreBreakdown.totalScore}
            </Text>
          </View>
        </View>

        <View style={styles.timeContainer}>
          <Text style={[styles.timeLabel, { color: theme.colors.textDim }]}>
            Time: {timeUsed}s
          </Text>
          {timeUsed < 15 && (
            <Text style={[styles.achievementText, { color: "#F59E0B" }]}>
              Lightning Fast! ⚡
            </Text>
          )}
        </View>
      </View>

      {/* Actions Section - 40% */}
      <Animated.View style={[styles.actionsSection, buttonAnimatedStyle]}>
        <Pressable
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>CONTINUE</Text>
        </Pressable>

        <Pressable
          style={styles.menuButton}
          onPress={handleMainMenu}
        >
          <Text style={styles.menuButtonText}>
            MAIN MENU
          </Text>
        </Pressable>
      </Animated.View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    minHeight: "100%",
    overflow: "visible",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  burstEffect: {
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  burstEmoji: {
    fontSize: 60,
    lineHeight: 72,
    opacity: 0.8,
    textAlign: "center",
  },
  resultSection: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  victoryText: {
    fontSize: 42,
    fontWeight: "bold",
    marginBottom: spacing.xs,
    textAlign: "center",
    textShadowColor: "rgba(245, 158, 11, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  starsContainer: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    overflow: "visible",
    paddingHorizontal: spacing.md,
  },
  star: {
    fontSize: 32,
    lineHeight: 40,
    overflow: "visible",
    textAlign: "center",
  },
  statsSection: {
    justifyContent: "center",
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  scoreBreakdownContainer: {
    marginBottom: spacing.lg,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  scoreLabel: {
    fontSize: 16,
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: "#F59E0B",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "bold",
  },
  totalValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  timeContainer: {
    alignItems: "center",
  },
  timeLabel: {
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  achievementText: {
    fontSize: 16,
    fontWeight: "600",
  },
  actionsSection: {
    alignItems: "center",
    gap: spacing.md,
    justifyContent: "center",
    paddingBottom: spacing.lg,
    paddingTop: spacing.lg,
  },
  continueButton: {
    alignItems: "center",
    backgroundColor: "#00AA44", // Rich green base
    borderRadius: 8, // Less rounded, more squarish
    elevation: 8,
    minWidth: 200,
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
  continueButtonText: {
    color: "#FFFFFF", // White text for contrast
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
    textShadowColor: "#003311", // Dark green shadow for depth
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  menuButton: {
    alignItems: "center",
    backgroundColor: "transparent", // No background for outline style
    borderColor: "#00AA44", // Green outline
    borderRadius: 8,
    borderWidth: 2,
    elevation: 2, // Minimal elevation
    minWidth: 200,
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
})