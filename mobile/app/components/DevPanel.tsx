import React, { useState } from "react"
import { View, StyleSheet, Pressable, Alert, ScrollView, Modal, Dimensions } from "react-native"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated"

import { ApiTester } from "@/services/apiTest"
import { gameService } from "@/services/gameService"
import { useAppTheme } from "@/theme/context"
import { spacing } from "@/theme/spacing"

import { Text } from "./Text"

const { width: screenWidth } = Dimensions.get("window")

interface DevPanelProps {
  visible: boolean
  onClose: () => void
}

export const DevPanel: React.FC<DevPanelProps> = ({ visible, onClose }) => {
  const { theme } = useAppTheme()
  const [testingApi, setTestingApi] = useState(false)

  const slideX = useSharedValue(screenWidth)
  const backdropOpacity = useSharedValue(0)

  React.useEffect(() => {
    if (visible) {
      slideX.value = withSpring(0, { damping: 15 })
      backdropOpacity.value = withTiming(0.5, { duration: 300 })
    } else {
      slideX.value = withSpring(screenWidth, { damping: 15 })
      backdropOpacity.value = withTiming(0, { duration: 300 })
    }
  }, [visible])

  const panelAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
  }))

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }))

  const handleTestApi = async () => {
    setTestingApi(true)
    try {
      const { overall, results } = await ApiTester.runFullTest()

      const passedTests = Object.values(results).filter((r) => r.success).length
      const totalTests = Object.keys(results).length

      if (overall) {
        Alert.alert(
          "🎉 API Test Success!",
          `All ${totalTests} tests passed!\n\nCheck console for detailed results.`,
          [{ text: "Awesome!" }],
        )
      } else {
        const failedTests = Object.entries(results)
          .filter(([_, result]) => !result.success)
          .map(([test, result]) => `${test}: ${result.message}`)
          .join("\n")

        Alert.alert(
          "⚠️ API Test Results",
          `${passedTests}/${totalTests} tests passed\n\nFailed tests:\n${failedTests}\n\nCheck console for details.`,
          [{ text: "OK" }],
        )
      }
    } catch (error) {
      Alert.alert("❌ Test Error", `Failed to run tests: ${error}`)
    } finally {
      setTestingApi(false)
    }
  }

  const handleClearSession = async () => {
    Alert.alert(
      "Clear User Session",
      "This will delete your saved user data and create a new anonymous user. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await gameService.clearSession()
            Alert.alert("Session Cleared", "A new user will be created when you enter the dojo.")
          },
        },
      ],
    )
  }

  const handleCreateTestUser = async () => {
    try {
      const session = await gameService.initializeSession()
      if (session) {
        Alert.alert("Test User Created", `New user: ${session.playerId}`)
      } else {
        Alert.alert("Error", "Failed to create test user")
      }
    } catch (error) {
      Alert.alert("Error", `Failed to create user: ${error}`)
    }
  }

  const handleTestGameFlow = async () => {
    try {
      // Test complete game flow
      Alert.alert(
        "Game Flow Test",
        "This will test: Session → Create Game → Make Move → Complete Game",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Run Test",
            onPress: async () => {
              try {
                console.log("🎮 Starting game flow test...")

                // Initialize session
                console.log("1. Initializing session...")
                const session = await gameService.initializeSession()
                if (!session) throw new Error("Session creation failed")
                console.log("✅ Session created:", session.playerId)

                // Create game
                console.log("2. Creating game...")
                const game = await gameService.createGame(1)
                if (!game) throw new Error("Game creation failed")
                console.log("✅ Game created:", game.id)

                // Make a move
                console.log("3. Making move...")
                const gameState = await gameService.makeMove(0)
                if (!gameState) throw new Error("Move failed")
                console.log("✅ Move successful, current player:", gameState.currentPlayer)

                // Complete game
                console.log("4. Completing game...")
                const result = await gameService.completeGame()
                if (!result) throw new Error("Game completion failed")
                console.log("✅ Game completed")

                Alert.alert(
                  "🎮 Game Flow Test Complete",
                  `✅ All steps successful!\n\nWinner: ${result.winner || "None"}\nScore: ${result.finalScore || 0}\n\nCheck console for detailed logs.`,
                )
              } catch (error) {
                console.error("❌ Game flow test failed:", error)
                Alert.alert(
                  "❌ Game Flow Test Failed",
                  `Error: ${error}\n\nCheck console for details.`,
                )
              }
            },
          },
        ],
      )
    } catch (error) {
      Alert.alert("Error", `Test setup failed: ${error}`)
    }
  }

  const getCurrentSession = () => {
    const session = gameService.getCurrentSession()
    Alert.alert(
      "Current Session",
      session
        ? `Player ID: ${session.playerId}\nGame ID: ${session.gameId || "None"}`
        : "No active session",
    )
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
        <Pressable style={styles.backdropPressable} onPress={onClose} />
      </Animated.View>

      {/* Dev Panel */}
      <Animated.View
        style={[styles.panel, { backgroundColor: theme.colors.background }, panelAnimatedStyle]}
      >
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.title, { color: theme.colors.text }]} preset="heading">
            🛠️ Dev Panel
          </Text>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Session Management */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Session Management
            </Text>

            <Pressable style={styles.button} onPress={getCurrentSession}>
              <Text style={styles.buttonText}>📋 Current Session Info</Text>
            </Pressable>

            <Pressable style={styles.button} onPress={handleCreateTestUser}>
              <Text style={styles.buttonText}>👤 Create Test User</Text>
            </Pressable>

            <Pressable style={[styles.button, styles.dangerButton]} onPress={handleClearSession}>
              <Text style={styles.buttonText}>🗑️ Clear Session</Text>
            </Pressable>
          </View>

          {/* API Testing */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>API Testing</Text>

            <Pressable
              style={[styles.button, testingApi && styles.disabledButton]}
              onPress={handleTestApi}
              disabled={testingApi}
            >
              <Text style={styles.buttonText}>
                {testingApi ? "🧪 Testing..." : "🧪 Run API Tests"}
              </Text>
            </Pressable>

            <Pressable style={styles.button} onPress={handleTestGameFlow}>
              <Text style={styles.buttonText}>🎮 Test Game Flow</Text>
            </Pressable>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Actions</Text>

            <Pressable
              style={styles.button}
              onPress={() => {
                console.log("🎯 Dev Panel: Quick action triggered")
                Alert.alert("Quick Action", "Check console for dev logs")
              }}
            >
              <Text style={styles.buttonText}>🎯 Trigger Dev Logs</Text>
            </Pressable>

            <Pressable
              style={styles.button}
              onPress={() => {
                Alert.alert(
                  "Environment Info",
                  `Node ENV: ${process.env.NODE_ENV || "unknown"}\nPlatform: React Native`,
                )
              }}
            >
              <Text style={styles.buttonText}>ℹ️ Environment Info</Text>
            </Pressable>
          </View>

          {/* Spacer for bottom */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "black",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  backdropPressable: {
    flex: 1,
  },
  bottomSpacer: {
    height: 50,
  },
  button: {
    alignItems: "center",
    backgroundColor: "#4A90E2",
    borderRadius: 8,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  closeButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.sm,
  },
  closeButtonText: {
    color: "#666",
    fontSize: 20,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  dangerButton: {
    backgroundColor: "#E74C3C",
  },
  disabledButton: {
    backgroundColor: "#95A5A6",
    opacity: 0.6,
  },
  header: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  panel: {
    bottom: 0,
    elevation: 10,
    position: "absolute",
    right: 0,
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    top: 0,
    width: screenWidth * 0.85,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 20,
  },
})
