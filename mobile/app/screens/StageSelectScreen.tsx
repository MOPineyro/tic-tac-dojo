import { useState, useEffect, useCallback, useRef } from "react"
import { StyleSheet, Pressable, View, Modal, TextInput, Alert } from "react-native"
import { useFocusEffect } from "@react-navigation/native"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
} from "react-native-reanimated"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { AppStackScreenProps } from "@/navigators/AppNavigator"
import { gameService } from "@/services/gameService"
import { useAppTheme } from "@/theme/context"
import { spacing } from "@/theme/spacing"

interface StageSelectScreenProps extends AppStackScreenProps<"StageSelect"> {}

interface Stage {
  id: string
  name: string
  gridSize: number
  background: string
  unlocked: boolean
  completed: boolean
  description: string
  level: number
}

// Mock stage data
const stages: Stage[] = [
  {
    id: "stage-1",
    name: "Cyber Dojo",
    gridSize: 3,
    background: "#00D9FF", // Neon Cyan
    unlocked: true,
    completed: false,
    description: "Enter the digital training grounds",
    level: 1,
  },
  {
    id: "stage-2",
    name: "Neon Temple",
    gridSize: 3,
    background: "#9945FF", // Neon Purple
    unlocked: false,
    completed: false,
    description: "Face AI masters in electric halls",
    level: 2,
  },
  {
    id: "stage-3",
    name: "Data Gardens",
    gridSize: 3,
    background: "#00FF88", // Jade Green
    unlocked: false,
    completed: false,
    description: "Battle among flowing code streams",
    level: 3,
  },
  {
    id: "stage-4",
    name: "Neural Networks",
    gridSize: 4,
    background: "#FFD600", // Electric Yellow
    unlocked: false,
    completed: false,
    description: "Navigate complex AI pathways",
    level: 4,
  },
  {
    id: "stage-5",
    name: "Master's Sanctum",
    gridSize: 4,
    background: "#FF0055", // Neon Red
    unlocked: false,
    completed: false,
    description: "Face the ultimate cyber-master",
    level: 5,
  },
]

export const StageSelectScreen = ({ navigation }: StageSelectScreenProps) => {
  const { theme } = useAppTheme()
  const [currentStageIndex, setCurrentStageIndex] = useState(0)
  const [playerProgress, setPlayerProgress] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Level unlock functionality
  const [showUnlockModal, setShowUnlockModal] = useState(false)
  const [unlockCode, setUnlockCode] = useState("")
  const [unlockingLevel, setUnlockingLevel] = useState<number | null>(null)
  const [unlockLoading, setUnlockLoading] = useState(false)
  const clickCountRef = useRef<{ [key: number]: number }>({})
  const clickTimeoutRef = useRef<{ [key: number]: NodeJS.Timeout }>({})

  const rotationValue = useSharedValue(0)
  const scaleValue = useSharedValue(1)

  useEffect(() => {
    // Subtle rotation animation for stage preview
    // Use requestAnimationFrame to avoid Reanimated warnings
    requestAnimationFrame(() => {
      rotationValue.value = withRepeat(withTiming(5, { duration: 3000 }), -1, true)
    })

    // Cleanup function
    return () => {
      // Clear any pending timeouts
      Object.values(clickTimeoutRef.current).forEach(clearTimeout)
    }
  }, []) // Empty dependency array - only run once on mount

  // Load player progress whenever screen comes into focus
  const loadPlayerProgress = useCallback(async () => {
    try {
      setLoading(true)
      // Ensure we have a session
      const session = await gameService.initializeSession()
      if (session) {
        const progress = await gameService.getPlayerProgress()
        setPlayerProgress(progress)
        console.log("Player progress loaded:", progress)

        // Auto-select the current level or highest unlocked level
        if (progress?.player?.currentLevel) {
          const levelIndex = Math.min(
            progress.player.currentLevel - 1, // currentLevel is 1-based, index is 0-based
            stages.length - 1,
          )
          setCurrentStageIndex(Math.max(0, levelIndex))
        }
      }
    } catch (error) {
      console.error("Failed to load player progress:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadPlayerProgress()
    }, [loadPlayerProgress]),
  )

  const previewAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotationValue.value}deg` }, { scale: scaleValue.value }],
    }
  })

  // Update stages with real player progress
  const getStagesWithProgress = () => {
    if (!playerProgress?.allLevels) return stages

    return stages.map((stage, index) => {
      const serverLevel = playerProgress.allLevels.find((l: any) => l.level === stage.level)
      return {
        ...stage,
        unlocked: serverLevel?.isUnlocked ?? false,
        completed: serverLevel?.progress?.completed ?? false,
      }
    })
  }

  const stagesWithProgress = getStagesWithProgress()
  const currentStage = stagesWithProgress[currentStageIndex]

  if (loading) {
    return (
      <Screen preset="fixed" safeAreaEdges={["top", "bottom"]}>
        <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading your progress...
          </Text>
        </View>
      </Screen>
    )
  }

  const handleStageSelect = () => {
    const currentLevel = currentStage.level

    if (!currentStage.unlocked) {
      // Track clicks for locked stages
      if (!clickCountRef.current[currentLevel]) {
        clickCountRef.current[currentLevel] = 0
      }

      clickCountRef.current[currentLevel]++

      // Clear any existing timeout for this level
      if (clickTimeoutRef.current[currentLevel]) {
        clearTimeout(clickTimeoutRef.current[currentLevel])
      }

      // Reset click count after 2 seconds of inactivity
      clickTimeoutRef.current[currentLevel] = setTimeout(() => {
        clickCountRef.current[currentLevel] = 0
      }, 2000)

      // Show unlock modal after 3 clicks
      if (clickCountRef.current[currentLevel] >= 3) {
        setUnlockingLevel(currentLevel)
        setShowUnlockModal(true)
        clickCountRef.current[currentLevel] = 0 // Reset count
      }
      return
    }

    scaleValue.value = withSpring(0.95, {}, () => {
      scaleValue.value = withSpring(1)
    })

    setTimeout(() => {
      navigation.navigate("Game", {
        level: currentStage.level,
        stage: currentStage,
      })
    }, 300)
  }

  const navigateStage = (direction: "prev" | "next") => {
    if (direction === "prev" && currentStageIndex > 0) {
      setCurrentStageIndex(currentStageIndex - 1)
    } else if (direction === "next" && currentStageIndex < stagesWithProgress.length - 1) {
      setCurrentStageIndex(currentStageIndex + 1)
    }
  }

  const handleUnlockAttempt = async () => {
    if (!unlockingLevel || !unlockCode.trim()) {
      Alert.alert("Error", "Please enter an unlock code")
      return
    }

    setUnlockLoading(true)
    try {
      const result = await gameService.unlockLevel(unlockingLevel, unlockCode.trim())

      if (result) {
        Alert.alert("Success!", result.message || `Level ${unlockingLevel} unlocked!`, [
          {
            text: "OK",
            onPress: () => {
              setShowUnlockModal(false)
              setUnlockCode("")
              setUnlockingLevel(null)
              // Refresh player progress to show newly unlocked level
              loadPlayerProgress()
            },
          },
        ])
      } else {
        Alert.alert("Failed", "Invalid unlock code or unable to unlock level")
      }
    } catch (error) {
      console.error("Unlock error:", error)
      Alert.alert("Error", "Failed to unlock level. Please try again.")
    } finally {
      setUnlockLoading(false)
    }
  }

  const handleCloseUnlockModal = () => {
    setShowUnlockModal(false)
    setUnlockCode("")
    setUnlockingLevel(null)
  }

  const ProgressDiamond = ({ filled }: { filled: boolean }) => (
    <View
      style={[
        styles.progressDiamond,
        {
          backgroundColor: filled ? "#FFD600" : "transparent",
          borderColor: filled ? "#FFD600" : theme.colors.border,
        },
      ]}
    />
  )

  const GridPreview = () => {
    // Get contrasting border color for the grid cells
    const getBorderColor = (bgColor: string) => {
      // For bright colors, use dark borders; for dark colors, use light borders
      switch (bgColor) {
        case "#00D9FF": // Cyan
        case "#00FF88": // Green
        case "#FFD600": // Yellow
          return "#1A1A24" // Dark border for bright backgrounds
        case "#9945FF": // Purple
        case "#FF0055": // Red
          return "#FFFFFF" // White border for darker backgrounds
        default:
          return theme.colors.border
      }
    }

    return (
      <Animated.View style={[styles.gridPreview, previewAnimatedStyle]}>
        <View
          style={[
            styles.previewContainer,
            {
              backgroundColor: theme.colors.palette.neutral400,
              borderColor: currentStage.background,
              borderWidth: 3,
            },
          ]}
        >
          {/* Dynamic Grid Preview */}
          <View
            style={[styles.gridContainer, currentStage.gridSize === 4 && styles.gridContainer4x4]}
          >
            {Array.from({ length: currentStage.gridSize * currentStage.gridSize }).map(
              (_, index) => (
                <View
                  key={index}
                  style={[
                    styles.gridCell,
                    currentStage.gridSize === 4 && styles.gridCell4x4,
                    {
                      backgroundColor: currentStage.background,
                      borderColor: getBorderColor(currentStage.background),
                      borderWidth: 2,
                    },
                  ]}
                />
              ),
            )}
          </View>
        </View>
      </Animated.View>
    )
  }

  return (
    <Screen
      preset="scroll"
      contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
      safeAreaEdges={["top", "bottom"]}
    >
      {/* Header */}
      <View style={styles.headerSection}>
        <Text style={[styles.headerText, { color: theme.colors.text }]} preset="heading">
          Select Stage
        </Text>
        {/* Leaderboard temporarily disabled
        <Pressable
          style={styles.leaderboardLink}
          onPress={() => navigation.navigate("Leaderboard")}
        >
          <Text style={styles.leaderboardText}>🏆 Leaderboard</Text>
        </Pressable>
        */}
      </View>

      {/* Stats Bar */}
      <View style={[styles.statsBar, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.statsText, { color: theme.colors.text }]}>
          Points: {(playerProgress?.player?.totalScore || 0).toLocaleString()}
        </Text>
        <Text style={[styles.statsText, { color: theme.colors.text }]}>
          Level: {playerProgress?.player?.currentLevel || 1}
        </Text>
      </View>

      {/* Main Stage Preview */}
      <View style={styles.mainSection}>
        <GridPreview />

        <View style={styles.stageInfo}>
          <Text style={[styles.stageName, { color: theme.colors.text }]} preset="subheading">
            {currentStage.name}
          </Text>

          <Text style={[styles.stageDescription, { color: theme.colors.textDim }]}>
            {currentStage.description}
          </Text>

          <View style={styles.statusContainer}>
            {!currentStage.unlocked && (
              <Text style={[styles.statusText, { color: "#FF006E" }]}>
                🔒 Complete previous stage to unlock
              </Text>
            )}
            {(currentStage.unlocked || currentStage.completed) && playerProgress?.allLevels && (
              <>
                {(() => {
                  const serverLevel = playerProgress.allLevels.find(
                    (l: any) => l.level === currentStage.level,
                  )
                  if (!serverLevel) return null

                  if (currentStage.completed) {
                    return (
                      <Text style={[styles.statusText, { color: theme.colors.success }]}>
                        ✓ Stage Completed
                      </Text>
                    )
                  }

                  const wins = serverLevel.progress?.wins || 0
                  const requiredWins = serverLevel.requiredWins || 1
                  const losses = serverLevel.progress?.losses || 0

                  // Single line format: "Progress: 2/3 wins (need 1 more) | W:2 L:1"
                  const remaining = requiredWins - wins
                  const needText = remaining > 0 ? ` (need ${remaining} more)` : ""
                  const recordText = losses > 0 ? ` | W:${wins} L:${losses}` : ""

                  return (
                    <Text style={[styles.statusText, { color: theme.colors.text }]}>
                      Progress: {wins}/{requiredWins} wins{needText}
                      {recordText}
                    </Text>
                  )
                })()}
              </>
            )}
          </View>
        </View>

        {/* Stage Navigation */}
        <View style={styles.navigationRow}>
          <Pressable
            style={[
              styles.navButton,
              {
                backgroundColor: currentStageIndex > 0 ? theme.colors.tint : theme.colors.border,
                opacity: currentStageIndex > 0 ? 1 : 0.5,
              },
            ]}
            onPress={() => navigateStage("prev")}
            disabled={currentStageIndex === 0}
          >
            <Text style={styles.navButtonText}>←</Text>
          </Pressable>

          <Pressable
            style={[
              styles.selectButton,
              {
                opacity: currentStage.unlocked ? 1 : 0.5,
              },
            ]}
            onPress={handleStageSelect}
          >
            <Text style={styles.selectButtonText}>
              {currentStage.unlocked ? "ENTER DOJO" : "LOCKED"}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.navButton,
              {
                backgroundColor:
                  currentStageIndex < stagesWithProgress.length - 1
                    ? theme.colors.tint
                    : theme.colors.border,
                opacity: currentStageIndex < stagesWithProgress.length - 1 ? 1 : 0.5,
              },
            ]}
            onPress={() => navigateStage("next")}
            disabled={currentStageIndex === stagesWithProgress.length - 1}
          >
            <Text style={styles.navButtonText}>→</Text>
          </Pressable>
        </View>
      </View>

      {/* Progress Section */}
      <View style={styles.progressSection}>
        <Text style={[styles.progressLabel, { color: theme.colors.text }]}>
          Stage {currentStage.level} of {stagesWithProgress.length}: {currentStage.name}
        </Text>

        <View style={styles.progressRow}>
          {stagesWithProgress.map((stage, index) => (
            <View key={stage.id} style={styles.progressItem}>
              <ProgressDiamond filled={stage.unlocked} />
              {index === currentStageIndex && (
                <View
                  style={[styles.currentIndicator, { backgroundColor: currentStage.background }]}
                />
              )}
            </View>
          ))}
        </View>

        <Text style={[styles.progressSubtext, { color: theme.colors.textDim }]}>
          {stagesWithProgress.filter((stage) => stage.unlocked).length} /{" "}
          {stagesWithProgress.length} stages accessible
        </Text>
      </View>

      {/* Level Unlock Modal */}
      <Modal
        visible={showUnlockModal}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCloseUnlockModal}
      >
        <Pressable style={styles.modalOverlay} onPress={handleCloseUnlockModal}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]} preset="heading">
              Unlock Level {unlockingLevel}
            </Text>
            <Text style={[styles.modalDescription, { color: theme.colors.textDim }]}>
              Enter a special unlock code to access this level. These codes can be found through
              challenges, easter eggs, or admin access.
            </Text>

            <TextInput
              style={[
                styles.codeInput,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              value={unlockCode}
              onChangeText={setUnlockCode}
              placeholder="Enter unlock code..."
              placeholderTextColor={theme.colors.textDim}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!unlockLoading}
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: theme.colors.border }]}
                onPress={handleCloseUnlockModal}
                disabled={unlockLoading}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: theme.colors.tint,
                    opacity: unlockLoading ? 0.6 : 1,
                  },
                ]}
                onPress={handleUnlockAttempt}
                disabled={unlockLoading || !unlockCode.trim()}
              >
                <Text style={[styles.modalButtonText, { color: "#FFFFFF" }]}>
                  {unlockLoading ? "Unlocking..." : "Unlock"}
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    minHeight: "100%",
    paddingHorizontal: spacing.lg,
  },
  currentIndicator: {
    borderRadius: 3,
    bottom: -12,
    height: 6,
    position: "absolute",
    width: 6,
  },
  gridCell: {
    borderRadius: 4,
    elevation: 2,
    height: "28%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    width: "28%",
  },
  gridCell4x4: {
    height: "20%",
    width: "20%",
  },
  gridContainer: {
    alignContent: "space-between",
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridContainer4x4: {
    gap: 2,
  },
  gridPreview: {
    marginBottom: spacing.xl,
  },
  headerSection: {
    alignItems: "center",
    paddingBottom: spacing.md,
    paddingTop: spacing.xl,
  },
  headerText: {
    fontSize: 28,
    fontWeight: "bold",
  },
  leaderboardLink: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  leaderboardText: {
    color: "#00FF88",
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.8,
  },
  statusContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
    minHeight: 40, // Fixed height to prevent button shift
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  progressInfo: {
    alignItems: "center",
    marginTop: spacing.sm,
  },
  progressText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  progressSubtext: {
    fontSize: 14,
    marginTop: spacing.xxs,
  },
  completedText: {
    fontSize: 16,
    fontWeight: "600",
  },
  mainSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
  },
  navButton: {
    alignItems: "center",
    borderRadius: 25,
    height: 50,
    justifyContent: "center",
    width: 50,
  },
  navButtonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    includeFontPadding: false,
    lineHeight: 20,
    marginTop: -6,
    textAlign: "center",
    textAlignVertical: "center",
  },
  navigationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  previewContainer: {
    borderRadius: 12,
    elevation: 8,
    height: 140,
    padding: spacing.sm,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    width: 140,
  },
  progressDiamond: {
    borderRadius: 2,
    borderWidth: 2,
    height: 16,
    transform: [{ rotate: "45deg" }],
    width: 16,
  },
  progressItem: {
    alignItems: "center",
    position: "relative",
  },
  progressLabel: {
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  progressRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  progressSection: {
    alignItems: "center",
    paddingBottom: spacing.xl,
  },
  selectButton: {
    alignItems: "center",
    backgroundColor: "#00AA44", // Rich green base
    borderRadius: 8, // Less rounded, more squarish
    elevation: 8,
    minWidth: 150,
    paddingHorizontal: spacing.lg,
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
  selectButtonText: {
    color: "#FFFFFF", // White text for contrast
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
    textShadowColor: "#003311", // Dark green shadow for depth
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  stageDescription: {
    fontSize: 14,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  stageInfo: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  stageName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: spacing.xs,
  },
  statsBar: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  statsText: {
    fontSize: 16,
    fontWeight: "600",
  },
  loadingText: {
    fontSize: 18,
    textAlign: "center",
  },
  // Modal styles
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalContent: {
    borderRadius: 12,
    elevation: 10,
    maxWidth: 400,
    padding: spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    width: "100%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: spacing.md,
    textAlign: "center",
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  codeInput: {
    borderWidth: 2,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 16,
    textAlign: "center",
    marginBottom: spacing.lg,
    fontFamily: "monospace", // Monospace font for codes
    letterSpacing: 2,
  },
  modalButtons: {
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  modalButton: {
    alignItems: "center",
    borderRadius: 8,
    flex: 1,
    paddingVertical: spacing.md,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
})
