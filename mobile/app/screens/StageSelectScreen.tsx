import { useState, useEffect } from "react"
import { StyleSheet, Pressable, View } from "react-native"
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
    gridSize: 3,
    background: "#FFD600", // Electric Yellow
    unlocked: false,
    completed: false,
    description: "Navigate complex AI pathways",
    level: 4,
  },
  {
    id: "stage-5",
    name: "Master's Sanctum",
    gridSize: 3,
    background: "#FF0055", // Neon Red
    unlocked: false,
    completed: false,
    description: "Face the ultimate cyber-master",
    level: 5,
  },
]

// Mock player stats
const mockPlayerStats = {
  points: 2450,
  lives: 3,
  currentStage: 0,
}

export const StageSelectScreen = ({ navigation, route }: StageSelectScreenProps) => {
  const { theme } = useAppTheme()
  const { selectedCharacter } = route.params
  const [currentStageIndex, setCurrentStageIndex] = useState(0)

  const rotationValue = useSharedValue(0)
  const scaleValue = useSharedValue(1)

  useEffect(() => {
    // Subtle rotation animation for stage preview
    rotationValue.value = withRepeat(withTiming(5, { duration: 3000 }), -1, true)
  }, [rotationValue])

  const previewAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationValue.value}deg` }, { scale: scaleValue.value }],
  }))

  const currentStage = stages[currentStageIndex]

  const handleStageSelect = () => {
    if (!currentStage.unlocked) return

    scaleValue.value = withSpring(0.95, {}, () => {
      scaleValue.value = withSpring(1)
    })

    setTimeout(() => {
      navigation.navigate("Game", {
        selectedCharacter,
        stage: currentStage,
      })
    }, 300)
  }

  const navigateStage = (direction: "prev" | "next") => {
    if (direction === "prev" && currentStageIndex > 0) {
      setCurrentStageIndex(currentStageIndex - 1)
    } else if (direction === "next" && currentStageIndex < stages.length - 1) {
      setCurrentStageIndex(currentStageIndex + 1)
    }
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
          {/* 3x3 Grid Preview */}
          <View style={styles.gridContainer}>
            {Array.from({ length: 9 }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.gridCell,
                  {
                    backgroundColor: currentStage.background,
                    borderColor: getBorderColor(currentStage.background),
                    borderWidth: 2,
                  },
                ]}
              />
            ))}
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
        <Pressable
          style={styles.leaderboardLink}
          onPress={() => navigation.navigate("Leaderboard")}
        >
          <Text style={styles.leaderboardText}>🏆 Leaderboard</Text>
        </Pressable>
      </View>

      {/* Stats Bar */}
      <View style={[styles.statsBar, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.statsText, { color: theme.colors.text }]}>
          Points: {mockPlayerStats.points.toLocaleString()}
        </Text>
        <Text style={[styles.statsText, { color: "#FF0055" }]}>⚔️ {mockPlayerStats.lives}</Text>
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

          <View style={styles.lockedTextContainer}>
            {!currentStage.unlocked && (
              <Text style={[styles.lockedText, { color: "#FF006E" }]}>
                🔒 Complete previous stage to unlock
              </Text>
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
            disabled={!currentStage.unlocked}
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
                  currentStageIndex < stages.length - 1 ? theme.colors.tint : theme.colors.border,
                opacity: currentStageIndex < stages.length - 1 ? 1 : 0.5,
              },
            ]}
            onPress={() => navigateStage("next")}
            disabled={currentStageIndex === stages.length - 1}
          >
            <Text style={styles.navButtonText}>→</Text>
          </Pressable>
        </View>
      </View>

      {/* Progress Section */}
      <View style={styles.progressSection}>
        <Text style={[styles.progressLabel, { color: theme.colors.text }]}>
          Stage {currentStage.level} of {stages.length}: {currentStage.name}
        </Text>

        <View style={styles.progressRow}>
          {stages.map((stage, index) => (
            <View key={stage.id} style={styles.progressItem}>
              <ProgressDiamond filled={index <= currentStageIndex && stage.unlocked} />
              {index === currentStageIndex && (
                <View
                  style={[styles.currentIndicator, { backgroundColor: currentStage.background }]}
                />
              )}
            </View>
          ))}
        </View>

        <Text style={[styles.progressSubtext, { color: theme.colors.textDim }]}>
          {stages.filter((stage) => stage.unlocked).length} / {stages.length} stages accessible
        </Text>
      </View>
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
    borderRadius: 6,
    elevation: 3,
    height: "30%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    width: "30%",
  },
  gridContainer: {
    alignContent: "space-between",
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
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
  lockedText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  lockedTextContainer: {
    alignItems: "center",
    height: 24,
    justifyContent: "center",
    marginTop: spacing.sm,
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
    height: 160,
    padding: spacing.md,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    width: 160,
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
  progressSubtext: {
    fontSize: 12,
    marginTop: spacing.xs,
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
})
