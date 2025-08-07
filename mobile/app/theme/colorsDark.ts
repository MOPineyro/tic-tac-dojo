const palette = {
  neutral900: "#FFFFFF",
  neutral800: "#F4F2F1",
  neutral700: "#D7CEC9",
  neutral600: "#B6ACA6",
  neutral500: "#978F8A",
  neutral400: "#564E4A",
  neutral300: "#3C3836",
  neutral200: "#191015",
  neutral100: "#000000",

  // Neon Cyber Colors (adapted for dark theme visibility)
  neonRed: "#FF4477",     // Primary action/Player O (slightly brighter)
  neonCyan: "#44DDFF",    // Secondary action/Player X (slightly brighter)
  neonPurple: "#AA77FF",  // Special effects/power (slightly brighter)
  neonPink: "#FF4488",    // Warnings/critical (slightly brighter)
  electricYellow: "#FFDD44", // Points/achievements (slightly toned)

  // Traditional Samurai Elements (adapted for dark theme)
  bloodOrange: "#FF5555", // Victory/samurai accent (brighter)
  cherryBlossom: "#FFCCDD", // Soft highlights (lighter)
  jadeGreen: "#44FFAA",   // Success states (brighter)
  goldFoil: "#FFDD44",    // Premium/legendary (toned)

  // Additional Game Colors (adapted for dark theme)
  richGreen: "#44CC66",   // Rich green base for buttons (brighter)
  darkGreen: "#228844",   // Dark green shadow (brighter)
  lightGreen: "#CCFFCC",  // Light green tint
  amber: "#FFBB44",       // Orange/amber for highlights (brighter)
  dangerRed: "#FF6666",   // Red for errors/danger (brighter)

  primary600: "#F4E0D9",
  primary500: "#E8C1B4",
  primary400: "#DDA28E",
  primary300: "#D28468",
  primary200: "#C76542",
  primary100: "#A54F31",

  secondary500: "#DCDDE9",
  secondary400: "#BCC0D6",
  secondary300: "#9196B9",
  secondary200: "#626894",
  secondary100: "#41476E",

  accent500: "#FFEED4",
  accent400: "#FFE1B2",
  accent300: "#FDD495",
  accent200: "#FBC878",
  accent100: "#FFBB50",

  angry100: "#F2D6CD",
  angry500: "#C03403",

  overlay20: "rgba(25, 16, 21, 0.2)",
  overlay50: "rgba(25, 16, 21, 0.5)",
  overlay80: "rgba(25, 16, 21, 0.8)",
} as const

export const colors = {
  palette,
  transparent: "rgba(0, 0, 0, 0)",
  text: palette.neutral800,
  textDim: palette.neutral600,
  background: palette.neutral200,
  border: palette.neutral400,
  surface: palette.neutral100, // Light surface for dark theme
  tint: palette.primary500,
  tintInactive: palette.neutral300,
  separator: palette.neutral300,
  error: palette.angry500,
  errorBackground: palette.angry100,
  // Game-specific colors for dark theme
  playerX: palette.neonCyan,     // Using neon cyan for X
  playerO: palette.neonRed,      // Using neon red for O
  success: palette.jadeGreen,    // Success states
  warning: palette.electricYellow, // Warning states
  gold: palette.goldFoil,        // Premium/achievements
  buttonPrimary: palette.richGreen,
  buttonPrimaryHighlight: palette.jadeGreen,
  buttonPrimaryShadow: palette.darkGreen,
  buttonSecondary: palette.amber,
  danger: palette.dangerRed
} as const
