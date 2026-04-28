/**
 * Mental Wealth Academy Design Tokens
 * 
 * A comprehensive TypeScript design system extracted from our design system.
 * Use these tokens for consistent styling across all components.
 * 
 * @see docs/design-system/design-system.css
 * @see SKILL.md
 */

// ============================================
// Color Tokens
// ============================================

/**
 * Brand Colors - Core palette for Mental Wealth Academy
 */
export const colors = {
  // Primary Colors
  primary: {
    DEFAULT: '#5168FF',
    hover: '#324BE4',
    muted: 'rgba(81, 104, 255, 0.6)',
    light: '#7586FF',
    dark: '#8A94FF',
  },
  
  // Secondary Colors
  secondary: {
    DEFAULT: '#50599B',
    hover: '#3C4686',
    muted: 'rgba(80, 89, 155, 0.6)',
    light: '#ADB7FF',
    dark: '#A79BC8',
  },
  
  // Background Colors
  background: {
    DEFAULT: '#FBF8FF',
    card: 'rgba(255, 255, 255, 0.95)',
    dark: '#090A10',
    cardDark: '#11131B',
    surfaceDark: '#171A24',
    surfaceDarkRaised: '#1D2130',
  },
  
  // Neutral Colors (Gray Scale)
  neutrals: {
    white: '#FFFFFF',
    50: '#FAFAFA',
    100: '#F4F5FE',
    200: '#ECECEC',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    black: '#000000',
  },
  
  // Text Colors
  text: {
    dark: '#1A1B24',
    light: '#FFFFFF',
    muted: 'rgba(26, 27, 36, 0.6)',
    soft: 'rgba(26, 27, 36, 0.72)',
    faint: 'rgba(26, 27, 36, 0.42)',
    foreground: 'rgba(26, 27, 36, 1.0)',
    secondary: 'rgba(26, 27, 36, 0.7)',
    // Dark mode variants
    foregroundDark: '#EEEAF8',
    secondaryDark: 'rgba(235, 232, 247, 0.78)',
    mutedDark: 'rgba(235, 232, 247, 0.64)',
    faintDark: 'rgba(235, 232, 247, 0.46)',
  },
  
  // Semantic Colors
  semantic: {
    success: {
      DEFAULT: '#50599B',
      light: '#ADB7FF',
      dark: '#3C4686',
      muted: 'rgba(80, 89, 155, 0.2)',
    },
    warning: {
      DEFAULT: '#F59E0B',
      light: '#FCD34D',
      dark: '#D97706',
      muted: 'rgba(245, 158, 11, 0.2)',
    },
    error: {
      DEFAULT: '#BA1A1A',
      light: '#FFDAD6',
      dark: '#93000A',
      muted: 'rgba(186, 26, 26, 0.2)',
    },
    info: {
      DEFAULT: '#5168FF',
      light: '#7586FF',
      dark: '#324BE4',
      muted: 'rgba(81, 104, 255, 0.2)',
    },
  },
  
  // Category Colors
  category: {
    mentalHealth: '#9724A6',
    productivity: '#5168FF',
    wealth: '#50599B',
  },
  
  // Gradient Colors
  gradient: {
    futuristicFlossStart: '#FBF8FF',
    futuristicFlossEnd: '#E1E1F4',
    futuristicFlossDarkStart: '#090A10',
    futuristicFlossDarkMid: '#11131B',
    futuristicFlossDarkEnd: '#0B0C12',
  },
  
  // Border Colors
  border: {
    DEFAULT: 'rgba(0, 0, 0, 0.08)',
    subtle: 'rgba(0, 0, 0, 0.05)',
    card: 'rgba(255, 255, 255, 0.8)',
    subtleDark: 'rgba(235, 232, 247, 0.10)',
    strongDark: 'rgba(235, 232, 247, 0.18)',
  },
} as const;

/**
 * Gradient Definitions
 */
export const gradients = {
  futuristicFloss: `linear-gradient(to bottom, ${colors.gradient.futuristicFlossStart}, ${colors.gradient.futuristicFlossEnd})`,
  primary: `linear-gradient(135deg, ${colors.primary.DEFAULT} 0%, ${colors.primary.light} 100%)`,
  secondary: `linear-gradient(135deg, ${colors.secondary.DEFAULT} 0%, ${colors.secondary.light} 100%)`,
  darkFuturisticFloss: `linear-gradient(180deg, ${colors.gradient.futuristicFlossDarkStart} 0%, ${colors.gradient.futuristicFlossDarkMid} 54%, ${colors.gradient.futuristicFlossDarkEnd} 100%)`,
  darkPrimary: 'linear-gradient(135deg, #8A94FF 0%, #BE9FE5 52%, #93D9B7 100%)',
  darkSecondary: 'linear-gradient(135deg, #766C96 0%, #927B72 100%)',
  swipeLike: `linear-gradient(135deg, ${colors.secondary.DEFAULT} 0%, #ADB7FF 100%)`,
  swipeSkip: `linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)`,
  swipeSave: `linear-gradient(135deg, ${colors.primary.DEFAULT} 0%, #7B8CFF 100%)`,
} as const;

// ============================================
// Typography Tokens
// ============================================

/**
 * Font Families
 */
export const fontFamilies = {
  primary: "'Poppins', sans-serif",
  secondary: "'Space Grotesk', sans-serif",
  mono: "'IBM Plex Mono', monospace",
} as const;

/**
 * Font Weights
 */
export const fontWeights = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

/**
 * Font Sizes - Golden Ratio Scale (φ = 1.618)
 * Harmonious typographic proportions
 */
export const fontSizes = {
  xs: '0.618rem',      // ~10px: base ÷ φ
  sm: '0.75rem',       // ~12px: base ÷ (φ × 0.85)
  base: '0.875rem',    // 14px - Body text baseline (maintained)
  md: '1rem',          // 16px - Comfortable reading
  lg: '1.125rem',      // ~18px: base × 1.125
  xl: '1.618rem',      // ~26px: base × φ
  '2xl': '2.618rem',   // ~42px: base × φ²
  '3xl': '4.236rem',   // ~68px: base × φ³
  '4xl': '6.854rem',   // ~110px: base × φ⁴
  '5xl': '11.09rem',   // ~177px: base × φ⁵
} as const;

/**
 * Line Heights
 */
export const lineHeights = {
  none: 1,
  tight: 1.2,       // Headings
  snug: 1.4,
  normal: 1.5,
  relaxed: 1.6,     // Body text
  loose: 1.75,
} as const;

/**
 * Letter Spacing
 */
export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.02em',   // Headlines
  normal: '0em',
  wide: '0.025em',
  wider: '0.05em',    // Buttons, uppercase
  widest: '0.1em',
} as const;

/**
 * Typography Presets - Ready-to-use text styles
 * Updated to use golden ratio-based font sizes
 */
export const typography = {
  h1: {
    fontFamily: fontFamilies.primary,
    fontSize: fontSizes['3xl'],     // ~68px (φ³)
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacing.tight,
  },
  h2: {
    fontFamily: fontFamilies.secondary,
    fontSize: fontSizes['2xl'],     // ~42px (φ²)
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacing.tight,
  },
  h3: {
    fontFamily: fontFamilies.secondary,
    fontSize: fontSizes.xl,         // ~26px (φ)
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.tight,
  },
  h4: {
    fontFamily: fontFamilies.secondary,
    fontSize: fontSizes.lg,         // ~18px
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.snug,
  },
  h5: {
    fontFamily: fontFamilies.secondary,
    fontSize: fontSizes.md,         // 16px
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.snug,
  },
  h6: {
    fontFamily: fontFamilies.secondary,
    fontSize: fontSizes.base,       // 14px
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.snug,
  },
  body: {
    fontFamily: fontFamilies.primary,
    fontSize: fontSizes.base,       // 14px
    fontWeight: fontWeights.light,
    lineHeight: lineHeights.relaxed,
  },
  bodyLarge: {
    fontFamily: fontFamilies.primary,
    fontSize: fontSizes.md,         // 16px
    fontWeight: fontWeights.light,
    lineHeight: lineHeights.relaxed,
  },
  bodySmall: {
    fontFamily: fontFamilies.primary,
    fontSize: fontSizes.sm,         // ~12px
    fontWeight: fontWeights.light,
    lineHeight: lineHeights.relaxed,
  },
  caption: {
    fontFamily: fontFamilies.primary,
    fontSize: fontSizes.xs,         // ~10px (÷φ)
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
  },
  button: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.base,       // 14px
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase' as const,
  },
  mono: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.base,       // 14px
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
    fontVariantNumeric: 'tabular-nums',
  },
} as const;

// ============================================
// Spacing Tokens (Golden Ratio Scale - φ = 1.618)
// ============================================

/**
 * Spacing Scale - Based on Golden Ratio
 * Provides harmonious proportions throughout the design
 */
export const spacing = {
  px: '1px',
  0: '0',
  
  // Golden ratio progression
  '3xs': '0.375rem',   // ~6px: φ⁻³
  '2xs': '0.5rem',     // ~8px
  xs: '0.625rem',      // ~10px: φ⁻²
  sm: '1rem',          // 16px: φ⁻¹ (base)
  md: '1.625rem',      // ~26px: φ⁰
  lg: '2.625rem',      // ~42px: φ¹
  xl: '4.25rem',       // ~68px: φ²
  '2xl': '6.875rem',   // ~110px: φ³
  
  // Legacy numeric scale (maintained for compatibility)
  0.5: '0.125rem',   // 2px
  1: '0.25rem',      // 4px - Micro spacing
  1.5: '0.375rem',   // 6px
  2: '0.5rem',       // 8px - Tight spacing
  2.5: '0.625rem',   // 10px
  3: '0.75rem',      // 12px - Standard spacing
  3.5: '0.875rem',   // 14px
  4: '1rem',         // 16px - Comfortable spacing
  5: '1.25rem',      // 20px
  6: '1.5rem',       // 24px - Generous spacing
  7: '1.75rem',      // 28px
  8: '2rem',         // 32px - Major separation
  9: '2.25rem',      // 36px
  10: '2.5rem',      // 40px
  11: '2.75rem',     // 44px
  12: '3rem',        // 48px - Large section breaks
  14: '3.5rem',      // 56px
  16: '4rem',        // 64px - Hero spacing
  20: '5rem',        // 80px
  24: '6rem',        // 96px
  28: '7rem',        // 112px
  32: '8rem',        // 128px
  36: '9rem',        // 144px
  40: '10rem',       // 160px
  44: '11rem',       // 176px
  48: '12rem',       // 192px
  52: '13rem',       // 208px
  56: '14rem',       // 224px
  60: '15rem',       // 240px
  64: '16rem',       // 256px
  72: '18rem',       // 288px
  80: '20rem',       // 320px
  96: '24rem',       // 384px
} as const;

// ============================================
// Border Radius Tokens (Golden Ratio Scale)
// ============================================

/**
 * Border Radius Scale - Golden Ratio Progression
 * Harmonious rounding for visual consistency
 */
export const borderRadius = {
  none: '0',
  sm: '0.25rem',     // 4px - Tags, badges, small chips
  DEFAULT: '0.375rem', // 6px
  md: '0.5rem',      // 8px - Buttons, inputs, small cards (φ-based)
  lg: '0.75rem',     // 12px - Standard cards, modals
  xl: '1.25rem',     // 20px - Hero cards, featured content (φ-based)
  '2xl': '2rem',     // 32px - Large containers (φ-based)
  '3xl': '3.25rem',  // 52px - Extra large elements (φ-based)
  full: '9999px',    // Pills, avatars, status indicators
} as const;

// ============================================
// Shadow Tokens
// ============================================

/**
 * Shadow Definitions - Subtle single shadows with border reinforcement
 */
export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  DEFAULT: '0 2px 4px rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px rgba(0, 0, 0, 0.07)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.12)',
  xl: '0 16px 48px rgba(0, 0, 0, 0.15)',
  '2xl': '0 25px 50px rgba(0, 0, 0, 0.25)',
  
  // Brand shadows with primary color
  primary: '0 4px 12px rgba(81, 104, 255, 0.3)',
  primaryHover: '0 6px 16px rgba(81, 104, 255, 0.4)',
  secondary: '0 4px 12px rgba(80, 89, 155, 0.3)',
  secondaryHover: '0 6px 16px rgba(80, 89, 155, 0.4)',
  
  // Card shadows
  card: '0 4px 16px rgba(81, 104, 255, 0.08)',
  cardHover: '0 8px 24px rgba(81, 104, 255, 0.15)',
  
  // Inner shadow
  inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
} as const;

// ============================================
// Breakpoints (Responsive Design)
// ============================================

/**
 * Breakpoint Values - Mobile-first approach
 */
export const breakpoints = {
  xs: '320px',       // Small phones
  sm: '480px',       // Large phones
  md: '768px',       // Tablets
  lg: '1024px',      // Laptops
  xl: '1280px',      // Desktops
  '2xl': '1536px',   // Large desktops
} as const;

/**
 * Media Query Helpers
 */
export const mediaQueries = {
  xs: `@media (min-width: ${breakpoints.xs})`,
  sm: `@media (min-width: ${breakpoints.sm})`,
  md: `@media (min-width: ${breakpoints.md})`,
  lg: `@media (min-width: ${breakpoints.lg})`,
  xl: `@media (min-width: ${breakpoints.xl})`,
  '2xl': `@media (min-width: ${breakpoints['2xl']})`,
  // Max-width queries for specific overrides
  maxXs: `@media (max-width: ${breakpoints.xs})`,
  maxSm: `@media (max-width: ${breakpoints.sm})`,
  maxMd: `@media (max-width: ${breakpoints.md})`,
  maxLg: `@media (max-width: ${breakpoints.lg})`,
  maxXl: `@media (max-width: ${breakpoints.xl})`,
} as const;

// ============================================
// Animation Tokens
// ============================================

/**
 * Animation Durations
 */
export const durations = {
  instant: '50ms',
  fast: '150ms',      // Micro-interactions (hover, focus)
  normal: '250ms',    // Standard transitions (cards, dropdowns)
  slow: '400ms',      // Large state changes (modals, sidebars)
  slower: '500ms',
  swipe: '300ms',     // Swipe card gamification
} as const;

/**
 * Easing Curves
 */
export const easings = {
  default: 'cubic-bezier(0.4, 0, 0.2, 1)',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0.25, 1, 0.5, 1)',
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
} as const;

/**
 * Transition Presets
 */
export const transitions = {
  fast: `all ${durations.fast} ${easings.default}`,
  normal: `all ${durations.normal} ${easings.default}`,
  slow: `all ${durations.slow} ${easings.default}`,
  bounce: `all ${durations.normal} ${easings.bounce}`,
  spring: `all ${durations.normal} ${easings.spring}`,
} as const;

// ============================================
// Z-Index Scale
// ============================================

/**
 * Z-Index Layers
 */
export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  card: 10,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  popover: 500,
  tooltip: 600,
  toast: 700,
  max: 9999,
} as const;

// ============================================
// Component Tokens
// ============================================

/**
 * Card Styles
 */
export const card = {
  background: colors.background.card,
  border: `1px solid ${colors.border.card}`,
  borderAccent: '0.5px solid rgba(0, 0, 0, 0.08)',
  radius: borderRadius.xl,
  padding: spacing[4],
  shadow: shadows.card,
  shadowHover: shadows.cardHover,
  transition: `box-shadow ${durations.normal} ${easings.out}, transform ${durations.normal} ${easings.out}`,
} as const;

/**
 * Button Styles
 */
export const button = {
  fontFamily: fontFamilies.mono,
  fontWeight: fontWeights.medium,
  letterSpacing: letterSpacing.wider,
  textTransform: 'uppercase' as const,
  paddingX: spacing[6],
  paddingY: spacing[3],
  borderRadius: borderRadius.sm,
  transition: transitions.normal,
} as const;

/**
 * Input Styles
 */
export const input = {
  fontFamily: fontFamilies.primary,
  fontSize: fontSizes.base,
  paddingX: spacing[4],
  paddingY: spacing[3],
  borderRadius: borderRadius.md,
  borderColor: colors.border.DEFAULT,
  focusBorderColor: colors.primary.DEFAULT,
  transition: transitions.fast,
} as const;

// ============================================
// Export All Tokens
// ============================================

export const designTokens = {
  colors,
  gradients,
  fontFamilies,
  fontWeights,
  fontSizes,
  lineHeights,
  letterSpacing,
  typography,
  spacing,
  borderRadius,
  shadows,
  breakpoints,
  mediaQueries,
  durations,
  easings,
  transitions,
  zIndex,
  card,
  button,
  input,
} as const;

export type DesignTokens = typeof designTokens;

export default designTokens;
