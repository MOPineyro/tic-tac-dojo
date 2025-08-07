import { useEffect, useState } from "react"
import { StyleSheet, View, Pressable, Alert, Image } from "react-native"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
} from "react-native-reanimated"

import { DevPanel } from "@/components/DevPanel"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { AppStackScreenProps } from "@/navigators/AppNavigator"
import { useAppTheme } from "@/theme/context"
import { spacing } from "@/theme/spacing"

interface WelcomeScreenProps extends AppStackScreenProps<"Welcome"> {}

export const WelcomeScreen = ({ navigation }: WelcomeScreenProps) => {
  const { theme } = useAppTheme()
  const [devPanelVisible, setDevPanelVisible] = useState(false)
  const [tapCount, setTapCount] = useState(0)

  // Animation values
  const logoOpacity = useSharedValue(0)
  const logoTranslateY = useSharedValue(-50)
  const subtitleOpacity = useSharedValue(0)
  const descriptionOpacity = useSharedValue(0)
  const buttonOpacity = useSharedValue(0)
  const buttonTranslateY = useSharedValue(50)

  useEffect(() => {
    // Welcome animation sequence
    logoOpacity.value = withTiming(1, { duration: 800 })
    logoTranslateY.value = withSpring(0, { damping: 15 })
    subtitleOpacity.value = withDelay(600, withTiming(1, { duration: 500 }))
    descriptionOpacity.value = withDelay(1000, withTiming(1, { duration: 500 }))
    buttonOpacity.value = withDelay(1400, withTiming(1, { duration: 400 }))
    buttonTranslateY.value = withDelay(1400, withSpring(0))
  }, [
    logoOpacity,
    logoTranslateY,
    subtitleOpacity,
    descriptionOpacity,
    buttonOpacity,
    buttonTranslateY,
  ])

  // Reset tap count after timeout
  useEffect(() => {
    if (tapCount > 0) {
      const timer = setTimeout(() => {
        setTapCount(0)
      }, 2000) // Reset after 2 seconds
      return () => clearTimeout(timer)
    }
    return undefined
  }, [tapCount])

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoTranslateY.value }],
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
    navigation.navigate("StageSelect")
  }

  // Secret dev panel activation - tap logo 5 times quickly
  const handleLogoPress = () => {
    const newTapCount = tapCount + 1
    setTapCount(newTapCount)

    if (newTapCount >= 5) {
      setDevPanelVisible(true)
      setTapCount(0)
      Alert.alert("🛠️ Dev Mode", "Developer panel activated!")
    }
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
        {/* Logo Section - Tap 5 times for dev panel */}
        <Animated.View style={[styles.logoSection, logoAnimatedStyle]}>
          <Pressable onPress={handleLogoPress} style={styles.logoContainer}>
            <Image
              source={require("../../assets/images/logo_bright.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
            {tapCount > 0 && (
              <View style={styles.tapIndicator}>
                <Text style={styles.tapCount}>{tapCount}/5</Text>
              </View>
            )}
          </Pressable>
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
                backgroundColor: theme.colors.buttonPrimary,
                borderTopColor: theme.colors.buttonPrimaryHighlight,
                borderLeftColor: theme.colors.buttonPrimaryHighlight,
                borderRightColor: theme.colors.buttonPrimaryShadow,
                borderBottomColor: theme.colors.buttonPrimaryShadow,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
            onPress={handleEnterDojo}
          >
            <Text style={[
              styles.enterButtonText,
              {
                color: theme.colors.palette.neutral100,
                textShadowColor: theme.colors.buttonPrimaryShadow,
              }
            ]}>ENTER THE DOJO</Text>
          </Pressable>
        </Animated.View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.colors.textDim }]}>
          &quot;The way of strategy is the way of nature&quot;
        </Text>
        <Text style={[styles.footerAuthor, { color: theme.colors.textDim }]}>
          - Miyamoto Musashi
        </Text>
      </View>

      {/* Developer Panel */}
      <DevPanel visible={devPanelVisible} onClose={() => setDevPanelVisible(false)} />
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
    borderRadius: 8, // Less rounded, more squarish
    elevation: 8,
    minWidth: 200,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
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
  enterButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
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
  footerAuthor: {
    fontSize: 12,
    fontStyle: "italic",
    opacity: 0.8,
    textAlign: "center",
  },
  footerText: {
    fontSize: 14,
    fontStyle: "italic",
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  logoImage: {
    height: 180,
    width: 180,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: spacing.xl,
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
  tapCount: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  tapIndicator: {
    backgroundColor: "#FF6B35",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    position: "absolute",
    right: 10,
    top: 10,
  },
})
