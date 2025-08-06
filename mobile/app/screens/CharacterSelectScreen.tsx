import { useState } from "react"
import { StyleSheet, Pressable, View } from "react-native"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import { AppStackScreenProps } from "@/navigators/AppNavigator"
import { spacing } from "@/theme/spacing"

interface CharacterSelectScreenProps extends AppStackScreenProps<"CharacterSelect"> {}

interface Character {
  id: string
  name: string
  symbol: "X" | "O"
  color: string
  description: string
  portrait: string
}

const characters: Character[] = [
  {
    id: "samurai",
    name: "Cyber Samurai",
    symbol: "X",
    color: "#00D9FF", // Neon Cyan
    description: "Digital warrior's honor",
    portrait: "🛡️" // Placeholder emoji
  },
  {
    id: "ninja",
    name: "Shadow Hacker", 
    symbol: "O",
    color: "#FF0055", // Neon Red
    description: "Code-breaking assassin",
    portrait: "🥷" // Placeholder emoji
  }
]

export const CharacterSelectScreen = ({ navigation }: CharacterSelectScreenProps) => {
  const { theme } = useAppTheme()
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null)
  
  const samuraiScale = useSharedValue(1)
  const ninjaScale = useSharedValue(1)
  const samuraiOpacity = useSharedValue(1)
  const ninjaOpacity = useSharedValue(1)

  const handleCharacterSelect = (characterId: string) => {
    if (selectedCharacter === characterId) return

    setSelectedCharacter(characterId)
    
    // Animate selection
    if (characterId === "samurai") {
      samuraiScale.value = withSpring(1.05)
      ninjaOpacity.value = withTiming(0.5)
    } else {
      ninjaScale.value = withSpring(1.05) 
      samuraiOpacity.value = withTiming(0.5)
    }

    // Auto-advance after selection
    setTimeout(() => {
      navigation.navigate("StageSelect", { selectedCharacter: characterId })
    }, 1500)
  }

  const samuraiAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: samuraiScale.value }],
    opacity: samuraiOpacity.value,
  }))

  const ninjaAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ninjaScale.value }],
    opacity: ninjaOpacity.value,
  }))

  const CharacterCard = ({ 
    character, 
    animatedStyle, 
    isSelected 
  }: { 
    character: Character, 
    animatedStyle: any, 
    isSelected: boolean 
  }) => (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={[
          styles.characterCard,
          {
            borderColor: isSelected ? character.color : theme.colors.border,
            backgroundColor: theme.colors.palette.neutral400,
            shadowColor: isSelected ? character.color : theme.colors.border,
          }
        ]}
        onPress={() => handleCharacterSelect(character.id)}
      >
        {/* Background Pattern */}
        <View style={[
          styles.cardBackground,
          {
            backgroundColor: character.color,
            opacity: isSelected ? 0.15 : 0.08,
          }
        ]} />
        
        {/* Character Pattern Elements */}
        <View style={styles.backgroundPattern}>
          {character.id === "samurai" ? (
            <>
              <Text style={[styles.patternText, { color: character.color, opacity: 0.1 }]}>⚔️</Text>
              <Text style={[styles.patternText, { color: character.color, opacity: 0.1 }]}>🛡️</Text>
              <Text style={[styles.patternText, { color: character.color, opacity: 0.1 }]}>⚔️</Text>
            </>
          ) : (
            <>
              <Text style={[styles.patternText, { color: character.color, opacity: 0.1 }]}>🥷</Text>
              <Text style={[styles.patternText, { color: character.color, opacity: 0.1 }]}>⚡</Text>
              <Text style={[styles.patternText, { color: character.color, opacity: 0.1 }]}>🥷</Text>
            </>
          )}
        </View>
        {/* Left side - Portrait */}
        <View style={styles.portraitContainer}>
          <Text style={styles.portraitEmoji}>{character.portrait}</Text>
          <View 
            style={[
              styles.symbolOverlay, 
              { backgroundColor: character.color }
            ]}
          >
            <Text style={styles.symbolText}>{character.symbol}</Text>
          </View>
        </View>
        
        {/* Right side - Text */}
        <View style={styles.characterInfo}>
          <Text 
            style={[styles.characterName, { color: theme.colors.text }]}
            preset="subheading"
            numberOfLines={2}
            adjustsFontSizeToFit
          >
            {character.name}
          </Text>
          
          <Text 
            style={[styles.characterDescription, { color: theme.colors.textDim }]}
            numberOfLines={2}
            adjustsFontSizeToFit
          >
            {character.description}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  )

  return (
    <Screen 
      preset="scroll"
      contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
      safeAreaEdges={["top", "bottom"]}
    >
      {/* Header Section - 20% */}
      <View style={styles.headerSection}>
        <Text
          style={[styles.headerText, { color: theme.colors.text }]}
          preset="heading"
        >
          Choose Your Side
        </Text>
        
        <Text
          style={[styles.subheaderText, { color: theme.colors.textDim }]}
        >
          X goes first
        </Text>
      </View>

      {/* Character Selection - 60% */}
      <View style={styles.selectionSection}>
        <View style={styles.characterColumn}>
          <CharacterCard
            character={characters[0]}
            animatedStyle={samuraiAnimatedStyle}
            isSelected={selectedCharacter === "samurai"}
          />
          
          <CharacterCard
            character={characters[1]}
            animatedStyle={ninjaAnimatedStyle}
            isSelected={selectedCharacter === "ninja"}
          />
        </View>
      </View>

      {/* Instructions Section - 20% */}
      <View style={styles.instructionSection}>
        {selectedCharacter && (
          <Animated.View
            entering={undefined} // Would use entering animation in production
          >
            <Text
              style={[styles.selectedText, { color: "#F59E0B" }]}
              preset="bold"
            >
              {characters.find(c => c.id === selectedCharacter)?.name} selected!
            </Text>
            <Text
              style={[styles.advancingText, { color: theme.colors.textDim }]}
            >
              Advancing to stage selection...
            </Text>
          </Animated.View>
        )}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    minHeight: "100%",
    paddingHorizontal: spacing.lg,
  },
  headerSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerText: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  subheaderText: {
    fontSize: 16,
    textAlign: "center",
  },
  selectionSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
  },
  characterColumn: {
    alignItems: "center",
    gap: spacing.lg,
    width: "100%",
  },
  characterCard: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 4,
    elevation: 12,
    flexDirection: "row",
    height: 140,
    justifyContent: "space-between",
    overflow: "visible",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    width: "95%",
  },
  portraitContainer: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 80,
    minWidth: 80,
    position: "relative",
    zIndex: 1,
  },
  portraitEmoji: {
    fontSize: 56,
    lineHeight: 64,
    textAlign: "center",
  },
  symbolOverlay: {
    alignItems: "center",
    borderRadius: 18,
    bottom: -8,
    height: 36,
    justifyContent: "center",
    position: "absolute",
    right: -8,
    width: 36,
    zIndex: 2,
  },
  symbolText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  characterInfo: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingLeft: spacing.md,
    zIndex: 1,
  },
  characterName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  characterDescription: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 18,
    textAlign: "center",
  },
  cardBackground: {
    borderRadius: 16,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  backgroundPattern: {
    alignItems: "center",
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: -1,
  },
  patternText: {
    fontSize: 32,
    fontWeight: "bold",
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: spacing.sm,
  },
  vsText: {
    fontSize: 16,
    fontWeight: "bold",
    backgroundColor: "#FAF5F0",
    paddingHorizontal: spacing.xs,
    position: "absolute",
  },
  instructionSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
  },
  selectedText: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  advancingText: {
    fontSize: 14,
    textAlign: "center",
  },
})