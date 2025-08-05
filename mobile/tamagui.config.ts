import { config } from '@tamagui/config/v3'
import { createTamagui } from '@tamagui/core'

// Game-specific theme for Tatami Tactics
const gameConfig = createTamagui({
  ...config,
  themes: {
    ...config.themes,
    // Japanese-inspired game theme
    game_light: {
      background: '#FAF5F0', // Tatami mat inspired off-white
      backgroundHover: '#F5F0E8',
      backgroundPress: '#F0E8D8',
      backgroundFocus: '#F5F0E8',
      color: '#1F2937', // Charcoal black for text
      colorHover: '#111827',
      colorPress: '#374151',
      colorFocus: '#111827',
      borderColor: '#D1D5DB',
      borderColorHover: '#9CA3AF',
      borderColorFocus: '#B91C1C', // Deep red accent
      borderColorPress: '#991B1B',
      placeholderColor: '#6B7280',
      
      // Game-specific colors
      primary: '#B91C1C', // Deep Red - Samurai accent
      primaryHover: '#991B1B',
      primaryPress: '#7F1D1D',
      secondary: '#1F2937', // Charcoal Black
      accent: '#F59E0B', // Gold for victory/special elements
      playerX: '#3B82F6', // Blue for player X
      playerO: '#EF4444', // Red for player O (AI)
      
      // Game board colors
      cellEmpty: '#FFFFFF',
      cellEmptyHover: '#F9FAFB',
      cellEmptyPress: '#F3F4F6',
      cellX: '#DBEAFE', // Light blue background for X
      cellO: '#FEE2E2', // Light red background for O
      
      // Power-up and special effects
      powerUp: '#FEF3C7', // Light gold
      powerUpActive: '#F59E0B',
      victory: '#10B981', // Green for victory
      defeat: '#EF4444', // Red for defeat
    },
    
    game_dark: {
      background: '#111827',
      backgroundHover: '#1F2937',
      backgroundPress: '#374151',
      backgroundFocus: '#1F2937',
      color: '#F9FAFB',
      colorHover: '#F3F4F6',
      colorPress: '#E5E7EB',
      colorFocus: '#F3F4F6',
      borderColor: '#374151',
      borderColorHover: '#4B5563',
      borderColorFocus: '#B91C1C',
      borderColorPress: '#991B1B',
      placeholderColor: '#9CA3AF',
      
      // Game-specific colors (dark mode)
      primary: '#DC2626',
      primaryHover: '#B91C1C',
      primaryPress: '#991B1B',
      secondary: '#F9FAFB',
      accent: '#FBBF24',
      playerX: '#60A5FA',
      playerO: '#F87171',
      
      // Game board colors (dark mode)
      cellEmpty: '#1F2937',
      cellEmptyHover: '#374151',
      cellEmptyPress: '#4B5563',
      cellX: '#1E3A8A',
      cellO: '#7F1D1D',
      
      // Power-up and special effects
      powerUp: '#92400E',
      powerUpActive: '#F59E0B',
      victory: '#059669',
      defeat: '#DC2626',
    }
  },
  
  // Custom tokens for game-specific spacing and sizing
  tokens: {
    ...config.tokens,
    size: {
      ...config.tokens.size,
      gameCell: 80, // Standard game cell size
      gameCellLarge: 100, // Large game cell for tablets
      gameCellSmall: 60, // Small game cell for compact layouts
      gameBoard: 280, // Total game board size
      gameBoardLarge: 350,
      gameBoardSmall: 210,
    },
    space: {
      ...config.tokens.space,
      gameGap: 4, // Gap between game cells
      screenPadding: 24, // Standard screen padding
      componentSpacing: 16, // Spacing between components
    },
    radius: {
      ...config.tokens.radius,
      gameCell: 8, // Rounded corners for game cells
      gameBoard: 16, // Rounded corners for game board
    }
  }
})

export default gameConfig
export type AppConfig = typeof gameConfig
declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends AppConfig {}
}