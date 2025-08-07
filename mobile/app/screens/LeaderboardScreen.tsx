import { useEffect } from "react"
import { StyleSheet, View, FlatList, Pressable } from "react-native"
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { AppStackScreenProps } from "@/navigators/AppNavigator"
import { useAppTheme } from "@/theme/context"
import { spacing } from "@/theme/spacing"

interface LeaderboardScreenProps extends AppStackScreenProps<"Leaderboard"> {}

interface LeaderboardEntry {
  id: string
  rank: number
  playerName: string
  score: number
  wins: number
  character: string
  badge?: string
}

// Mock leaderboard data
const mockLeaderboardData: LeaderboardEntry[] = [
  {
    id: "1",
    rank: 1,
    playerName: "Master Yuki",
    score: 15420,
    wins: 87,
    character: "❄️",
    badge: "👑",
  },
  {
    id: "2",
    rank: 2,
    playerName: "Sensei Kenji",
    score: 14250,
    wins: 79,
    character: "🟣",
    badge: "🥈",
  },
  {
    id: "3",
    rank: 3,
    playerName: "Ninja Sakura",
    score: 13890,
    wins: 72,
    character: "🌸",
    badge: "🥉",
  },
  {
    id: "4",
    rank: 4,
    playerName: "Warrior Tetsu",
    score: 12440,
    wins: 68,
    character: "🔴",
    badge: "⚔️",
  },
  {
    id: "5",
    rank: 5,
    playerName: "Dragon Ryu",
    score: 11350,
    wins: 61,
    character: "🐉",
    badge: "🔥",
  },
  {
    id: "6",
    rank: 6,
    playerName: "Shadow Hunter",
    score: 10200,
    wins: 54,
    character: "🟣",
    badge: "",
  },
  {
    id: "7",
    rank: 7,
    playerName: "Storm Blade",
    score: 9800,
    wins: 49,
    character: "❄️",
    badge: "",
  },
  {
    id: "8",
    rank: 8,
    playerName: "Silent Strike",
    score: 9200,
    wins: 44,
    character: "🌸",
    badge: "",
  },
  { id: "9", rank: 9, playerName: "Iron Fist", score: 8750, wins: 39, character: "🔴", badge: "" },
  {
    id: "10",
    rank: 10,
    playerName: "Wind Walker",
    score: 8200,
    wins: 35,
    character: "🐉",
    badge: "",
  },
]

export const LeaderboardScreen = ({ navigation }: LeaderboardScreenProps) => {
  const { theme } = useAppTheme()

  const headerOpacity = useSharedValue(1) // Start visible for debugging
  useEffect(() => {
    // Simplified animation - start from visible
    headerOpacity.value = withTiming(1, { duration: 300 })
  }, [headerOpacity])

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }))

  const handleGoBack = () => {
    navigation.goBack()
  }

  const renderLeaderboardItem = ({ item }: { item: LeaderboardEntry }) => (
    <View style={[styles.leaderboardItem, { backgroundColor: theme.colors.palette.neutral400 }]}>
      <View style={styles.rankSection}>
        <Text
          style={[styles.rankNumber, { color: item.rank <= 3 ? theme.colors.gold : theme.colors.text }]}
        >
          #{item.rank}
        </Text>
        {item.badge && <Text style={styles.badge}>{item.badge}</Text>}
      </View>

      <View style={styles.playerSection}>
        <Text style={styles.characterIcon}>{item.character}</Text>
        <View style={styles.playerInfo}>
          <Text style={[styles.playerName, { color: theme.colors.text }]}>{item.playerName}</Text>
          <Text style={[styles.winsText, { color: theme.colors.textDim }]}>{item.wins} wins</Text>
        </View>
      </View>

      <View style={styles.scoreSection}>
        <Text style={[styles.scoreText, { color: theme.colors.tint }]}>
          {item.score.toLocaleString()}
        </Text>
        <Text style={[styles.pointsLabel, { color: theme.colors.textDim }]}>points</Text>
      </View>
    </View>
  )

  return (
    <Screen
      preset="scroll"
      contentContainerStyle={{ minHeight: "100%" }}
      style={{ backgroundColor: theme.colors.background }}
      safeAreaEdges={["top", "bottom"]}
    >
      <View style={styles.container}>
        {/* Header */}
        <Animated.View style={[styles.headerSection, headerAnimatedStyle]}>
          <Pressable style={styles.backButton} onPress={handleGoBack}>
            <Text style={[styles.backButtonText, { color: theme.colors.success }]}>← Back</Text>
          </Pressable>

          <Text style={[styles.headerText, { color: theme.colors.text }]} preset="heading">
            🏆 Leaderboard
          </Text>

          <Text style={[styles.subtitleText, { color: theme.colors.textDim }]}>
            Top warriors of the dojo
          </Text>
        </Animated.View>

        {/* Leaderboard List */}
        <View style={styles.listSection}>
          <FlatList
            data={mockLeaderboardData}
            renderItem={renderLeaderboardItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            scrollEnabled={false}
          />
        </View>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: "flex-start",
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  badge: {
    fontSize: 16,
    marginLeft: spacing.xs,
  },
  characterIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  container: {
    paddingHorizontal: spacing.lg,
  },

  headerSection: {
    alignItems: "center",
    paddingBottom: spacing.lg,
    paddingTop: spacing.lg,
  },
  headerText: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: spacing.xs,
  },
  leaderboardItem: {
    alignItems: "center",
    borderRadius: 12,
    elevation: 3,
    flexDirection: "row",
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  listSection: {
    paddingBottom: spacing.xl,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  playerSection: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
  },
  pointsLabel: {
    fontSize: 12,
    textAlign: "center",
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: "bold",
  },
  rankSection: {
    alignItems: "center",
    flexDirection: "row",
    minWidth: 60,
  },
  scoreSection: {
    alignItems: "center",
    minWidth: 80,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 2,
  },
  subtitleText: {
    fontSize: 14,
  },
  winsText: {
    fontSize: 12,
  },
})
