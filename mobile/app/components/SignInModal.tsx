import React, { useEffect } from "react"
import { StyleSheet, Pressable, View, Modal } from "react-native"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated"
import { Text } from "./Text"
import { useAppTheme } from "@/theme/context"
import { spacing } from "@/theme/spacing"

interface SignInModalProps {
  visible: boolean
  onClose: () => void
  onSignIn: () => Promise<void>
  onContinueAsGuest: () => void
  trigger?: "firstWin" | "thirdGame" | "highScore" | "manual"
}

interface ModalMessage {
  title: string
  subtitle: string
  benefits: string[]
}

const modalMessages: Record<string, ModalMessage> = {
  firstWin: {
    title: "Congratulations! 🎉",
    subtitle: "Save this victory to your record!",
    benefits: ["🏆 Save Progress", "📊 Leaderboards", "🎯 Achievements"]
  },
  highScore: {
    title: "New High Score! 🏆", 
    subtitle: "Add your name to the leaderboard!",
    benefits: ["🥇 Global Rankings", "📈 Track Stats", "🎖️ Unlock Badges"]
  },
  thirdGame: {
    title: "You're on a roll! 🔥",
    subtitle: "Create an account to track stats!",
    benefits: ["💾 Cloud Save", "📱 Cross-Device", "🎮 Full Features"]
  },
  manual: {
    title: "Join the Dojo! 🥋",
    subtitle: "Unlock the full Tatami Tactics experience",
    benefits: ["🏆 Save Progress", "📊 Leaderboards", "🎯 Achievements"]
  }
}

export const SignInModal: React.FC<SignInModalProps> = ({
  visible,
  onClose,
  onSignIn,
  onContinueAsGuest,
  trigger = "manual"
}) => {
  const { theme } = useAppTheme()
  const [isLoading, setIsLoading] = React.useState(false)
  
  // Animation values
  const backdropOpacity = useSharedValue(0)
  const modalTranslateY = useSharedValue(300)
  const modalScale = useSharedValue(0.9)
  const contentOpacity = useSharedValue(0)

  const message = modalMessages[trigger]

  useEffect(() => {
    if (visible) {
      // Show modal animation
      backdropOpacity.value = withTiming(0.7, { duration: 200 })
      modalTranslateY.value = withSpring(0, { damping: 15 })
      modalScale.value = withSpring(1, { damping: 15 })
      contentOpacity.value = withTiming(1, { duration: 300 })
    } else {
      // Hide modal animation
      backdropOpacity.value = withTiming(0, { duration: 200 })
      modalTranslateY.value = withTiming(300, { duration: 200 })
      modalScale.value = withTiming(0.9, { duration: 200 })
      contentOpacity.value = withTiming(0, { duration: 200 })
    }
  }, [visible])

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }))

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: modalTranslateY.value },
      { scale: modalScale.value }
    ],
    opacity: contentOpacity.value,
  }))

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      await onSignIn()
    } catch (error) {
      console.error("Sign in failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackdropPress = () => {
    onClose()
  }

  if (!visible) return null

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.modalContainer}>
        {/* Backdrop */}
        <Animated.View
          style={[styles.backdrop, backdropAnimatedStyle]}
        >
          <Pressable 
            style={StyleSheet.absoluteFill}
            onPress={handleBackdropPress}
          />
        </Animated.View>

        {/* Modal Content */}
        <Animated.View
          style={[
            styles.modalContent,
            { backgroundColor: theme.colors.background },
            modalAnimatedStyle
          ]}
        >
          {/* Close Button */}
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={[styles.closeButtonText, { color: theme.colors.textDim }]}>
              ✕
            </Text>
          </Pressable>

          {/* Header */}
          <View style={styles.header}>
            <Text
              style={[styles.title, { color: theme.colors.text }]}
              preset="heading"
            >
              {message.title}
            </Text>
            <Text
              style={[styles.subtitle, { color: theme.colors.textDim }]}
            >
              {message.subtitle}
            </Text>
          </View>

          {/* Benefits */}
          <View style={styles.benefitsContainer}>
            {message.benefits.map((benefit, index) => (
              <View key={index} style={styles.benefitRow}>
                <Text style={[styles.benefitText, { color: theme.colors.text }]}>
                  {benefit}
                </Text>
              </View>
            ))}
          </View>

          {/* Google Sign In Button */}
          <Pressable
            style={[
              styles.googleButton,
              { opacity: isLoading ? 0.7 : 1 }
            ]}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
          >
            <View style={styles.googleButtonContent}>
              <Text style={styles.googleLogo}>G</Text>
              <Text style={styles.googleButtonText}>
                {isLoading ? "Signing in..." : "Sign in with Google"}
              </Text>
            </View>
          </Pressable>

          {/* Continue as Guest */}
          <Pressable
            style={styles.guestButton}
            onPress={onContinueAsGuest}
          >
            <Text style={[styles.guestButtonText, { color: theme.colors.textDim }]}>
              Continue as Guest
            </Text>
          </Pressable>

          {/* Disclaimer */}
          <Text style={[styles.disclaimer, { color: theme.colors.textDim }]}>
            Your progress will be saved locally and can be transferred when you sign in
          </Text>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
  },
  modalContent: {
    width: "90%",
    maxWidth: 400,
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  closeButton: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  benefitsContainer: {
    marginBottom: spacing.xl,
  },
  benefitRow: {
    paddingVertical: spacing.xs,
  },
  benefitText: {
    fontSize: 16,
    textAlign: "center",
    fontWeight: "500",
  },
  googleButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DADCE0",
    borderRadius: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  googleButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  googleLogo: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4285F4",
    marginRight: spacing.sm,
    fontFamily: "Inter", // Would be proper Google font in production
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#3C4043",
  },
  guestButton: {
    paddingVertical: spacing.sm,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  guestButtonText: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
  disclaimer: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
    opacity: 0.8,
  },
})