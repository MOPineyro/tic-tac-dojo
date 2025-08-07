const palette = {
  // Dark Backgrounds (Toned Down)
  neutral100: "#FFFFFF", // Keep white for contrast
  neutral200: "#3A3A4A", // Surface Dark (cards/modals) - lighter
  neutral300: "#2F2F3C", // Tertiary Dark (lighter panels) - lighter
  neutral400: "#242430", // Secondary Dark (charcoal) - lighter
  neutral500: "#1A1A24", // Primary Dark (dark but not black) - much lighter
  neutral600: "#564E4A", // Keep original dim text
  neutral700: "#3C3836", // Keep original
  neutral800: "#191015", // Keep original
  neutral900: "#000000", // Pure black

  // Neon Cyber Colors
  neonRed: "#FF0055",     // Primary action/Player O
  neonCyan: "#00D9FF",    // Secondary action/Player X
  neonPurple: "#9945FF",  // Special effects/power
  neonPink: "#FF006E",    // Warnings/critical
  electricYellow: "#FFD600", // Points/achievements

  // Traditional Samurai Elements
  bloodOrange: "#FF3333", // Victory/samurai accent
  cherryBlossom: "#FFB7C5", // Soft highlights
  jadeGreen: "#00FF88",   // Success states
  goldFoil: "#FFD700",    // Premium/legendary

  // Additional Game Colors
  richGreen: "#00AA44",   // Rich green base for buttons
  darkGreen: "#006622",   // Dark green shadow
  lightGreen: "#E0FFE0",  // Light green tint
  amber: "#F59E0B",       // Orange/amber for highlights
  dangerRed: "#EF4444",   // Red for errors/danger

  // Character-specific colors
  yukiCyan: "#00D9FF",    // Yuki (Novice)
  kenjiPurple: "#9945FF", // Kenji (Methodical)
  sakuraPink: "#FFB7C5",  // Sakura (Cunning)
  tetsuRed: "#FF3333",    // Tetsu (Immovable)
  ryuGold: "#FFD700",     // Master Ryu

  // Legacy colors for compatibility
  primary100: "#FFB7C5", // Cherry Blossom
  primary200: "#FF3333", // Blood Orange
  primary300: "#FF0055", // Neon Red
  primary400: "#FF006E", // Neon Pink
  primary500: "#FF0055", // Main tint - Neon Red
  primary600: "#FF3333", // Blood Orange

  secondary100: "#00D9FF", // Neon Cyan
  secondary200: "#9945FF", // Neon Purple
  secondary300: "#00FF88", // Jade Green
  secondary400: "#FFD600", // Electric Yellow
  secondary500: "#FFD700", // Gold Foil

  accent100: "#FFD700", // Gold
  accent200: "#FFD600", // Electric Yellow
  accent300: "#00FF88", // Jade Green
  accent400: "#00D9FF", // Neon Cyan
  accent500: "#FF0055", // Neon Red

  angry100: "#2D2D3A", // Dark surface for error background
  angry500: "#FF006E", // Neon Pink for errors

  overlay20: "rgba(10, 10, 11, 0.2)",  // Dark overlay
  overlay50: "rgba(10, 10, 11, 0.5)",  // Dark overlay
  overlay80: "rgba(10, 10, 11, 0.8)",  // Dark overlay
} as const

export const colors = {
  /**
   * The palette is available to use, but prefer using the name.
   * This is only included for rare, one-off cases. Try to use
   * semantic names as much as possible.
   */
  palette,
  /**
   * A helper for making something see-thru.
   */
  transparent: "rgba(0, 0, 0, 0)",
  /**
   * The default text color in many components.
   */
  text: palette.neutral100, // White text on dark background
  /**
   * Secondary text information.
   */
  textDim: palette.cherryBlossom, // Cherry blossom for dimmed text
  /**
   * The default color of the screen background.
   */
  background: palette.neutral500, // Primary Dark (almost black)
  /**
   * The default border color.
   */
  border: palette.neutral400, // Secondary Dark (charcoal)
  /**
   * Surface color for cards, modals, etc.
   */
  surface: palette.neutral200, // Surface Dark
  /**
   * The main tinting color.
   */
  tint: palette.neonRed, // Neon Red for primary actions
  /**
   * The inactive tinting color.
   */
  tintInactive: palette.neutral300, // Tertiary Dark
  /**
   * A subtle color used for lines.
   */
  separator: palette.neutral400, // Secondary Dark
  /**
   * Error messages.
   */
  error: palette.neonPink, // Neon Pink for errors
  /**
   * Error Background.
   */
  errorBackground: palette.angry100, // Dark surface
  /**
   * Game-specific colors
   */
  playerX: palette.neonCyan,
  playerO: palette.neonRed,
  success: palette.jadeGreen,
  warning: palette.electricYellow,
  gold: palette.goldFoil,
  buttonPrimary: palette.richGreen,
  buttonPrimaryHighlight: palette.jadeGreen,
  buttonPrimaryShadow: palette.darkGreen,
  buttonSecondary: palette.amber,
  danger: palette.dangerRed
} as const
