import { useEffect } from "react"
import { StyleSheet, View, Pressable } from "react-native"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
} from "react-native-reanimated"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { AppStackScreenProps } from "@/navigators/AppNavigator"
import { useAppTheme } from "@/theme/context"
import { spacing } from "@/theme/spacing"

interface WelcomeScreenProps extends AppStackScreenProps<"Welcome"> {}

export const WelcomeScreen = ({ navigation }: WelcomeScreenProps) => {
  const { theme } = useAppTheme()

  // Animation values
  const logoOpacity = useSharedValue(0)
  const logoTranslateY = useSharedValue(-50)
  const titleOpacity = useSharedValue(0)
  const titleScale = useSharedValue(0.8)
  const subtitleOpacity = useSharedValue(0)
  const descriptionOpacity = useSharedValue(0)
  const buttonOpacity = useSharedValue(0)
  const buttonTranslateY = useSharedValue(50)

  useEffect(() => {
    // Welcome animation sequence
    logoOpacity.value = withTiming(1, { duration: 800 })
    logoTranslateY.value = withSpring(0, { damping: 15 })
    titleOpacity.value = withDelay(400, withTiming(1, { duration: 600 }))
    titleScale.value = withDelay(400, withSpring(1, { damping: 12 }))
    subtitleOpacity.value = withDelay(800, withTiming(1, { duration: 500 }))
    descriptionOpacity.value = withDelay(1200, withTiming(1, { duration: 500 }))
    buttonOpacity.value = withDelay(1600, withTiming(1, { duration: 400 }))
    buttonTranslateY.value = withDelay(1600, withSpring(0))
  }, [
    logoOpacity,
    logoTranslateY,
    titleOpacity,
    titleScale,
    subtitleOpacity,
    descriptionOpacity,
    buttonOpacity,
    buttonTranslateY,
  ])

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoTranslateY.value }],
  }))

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ scale: titleScale.value }],
  }))

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }))

  const descriptionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: descriptionOpacity.value,
  }))

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }))

  const handleEnterDojo = () => {
    navigation.navigate("CharacterSelect")
  }

  return (
    <Screen
      preset="scroll"
      contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
      safeAreaEdges={["top", "bottom"]}
    >
      {/* Background Pattern */}
      <View style={styles.backgroundPattern}>
        <Text style={styles.patternText}>道</Text>
        <Text style={styles.patternText}>場</Text>
        <Text style={styles.patternText}>武</Text>
        <Text style={styles.patternText}>士</Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Logo Section */}
        <Animated.View style={[styles.logoSection, logoAnimatedStyle]}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoEmoji}>🏯</Text>
            <Text style={styles.logoText}>道場</Text>
          </View>
        </Animated.View>

        {/* Title Section */}
        <Animated.View style={[styles.titleSection, titleAnimatedStyle]}>
          <Text style={[styles.mainTitle, { color: theme.colors.text }]} preset="heading">
            Tic-Tac-Dojo
          </Text>
        </Animated.View>

        {/* Subtitle */}
        <Animated.View style={subtitleAnimatedStyle}>
          <Text style={[styles.subtitle, { color: theme.colors.tint }]} preset="subheading">
            Master the Way of the Grid
          </Text>
        </Animated.View>

        {/* Description */}
        <Animated.View style={[styles.descriptionSection, descriptionAnimatedStyle]}>
          <Text style={[styles.description, { color: theme.colors.textDim }]}>
            Challenge AI opponents across 5 progressive difficulty levels.
          </Text>
        </Animated.View>

        {/* Features List */}
        <Animated.View style={[styles.featuresSection, descriptionAnimatedStyle]}>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>⚔️</Text>
            <Text style={[styles.featureText, { color: theme.colors.text }]}>
              Progressive AI difficulty
            </Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>🏆</Text>
            <Text style={[styles.featureText, { color: theme.colors.text }]}>
              Arcade-style scoring
            </Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>📊</Text>
            <Text style={[styles.featureText, { color: theme.colors.text }]}>
              Global leaderboards
            </Text>
          </View>
        </Animated.View>

        {/* Enter Button */}
        <Animated.View style={[styles.buttonSection, buttonAnimatedStyle]}>
          <Pressable
            style={({ pressed }) => [
              styles.enterButton,
              {
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
            onPress={handleEnterDojo}
          >
            <Text style={styles.enterButtonText}>ENTER THE DOJO</Text>
            <Text style={styles.enterButtonSubtext}>道場に入る</Text>
          </Pressable>
        </Animated.View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.colors.textDim }]}>
          &quot;The way of strategy is the way of nature&quot; - Miyamoto Musashi
        </Text>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  backgroundPattern: {
    alignItems: "center",
    bottom: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    left: 0,
    opacity: 0.05,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: -1,
  },
  buttonSection: {
    alignItems: "center",
  },
  container: {
    minHeight: "100%",
  },
  content: {
    justifyContent: "center",
    minHeight: "80%",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  descriptionSection: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  enterButton: {
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
  enterButtonSubtext: {
    color: "#E0FFE0", // Light green tint for Japanese text
    fontSize: 12,
    marginTop: spacing.xs,
    opacity: 0.95,
    textShadowColor: "#003311", // Dark green shadow for depth
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  enterButtonText: {
    color: "#FFFFFF", // White text for contrast
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
    textShadowColor: "#003311", // Dark green shadow for depth
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: spacing.md,
    width: 30,
  },
  featureRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  featureText: {
    flex: 1,
    fontSize: 16,
  },
  featuresSection: {
    marginBottom: spacing.xxl,
  },
  footer: {
    alignItems: "center",
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  footerText: {
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
  },
  logoContainer: {
    alignItems: "center",
    backgroundColor: "rgba(45, 45, 58, 0.9)",
    borderColor: "#00D9FF",
    borderRadius: 20,
    borderWidth: 2,
    elevation: 4,
    minHeight: 120,
    minWidth: 120,
    overflow: "visible",
    padding: spacing.lg,
    shadowColor: "#00D9FF",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  logoEmoji: {
    fontSize: 48,
    lineHeight: 56,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  logoText: {
    color: "#B91C1C",
    fontSize: 32,
    fontWeight: "bold",
  },
  mainTitle: {
    fontSize: 36,
    fontWeight: "bold",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  patternText: {
    color: "#1F2937",
    fontSize: 120,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: spacing.xl,
    textAlign: "center",
  },
  titleSection: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
})
