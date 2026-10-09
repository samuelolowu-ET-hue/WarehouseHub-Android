/**
 * WarehouseHub design tokens.
 *
 * The neutral palette mirrors the existing WarehouseHub order-confirmation
 * email (charcoal #1C1C1E, warm off-white #F5F3EF, stone #DDD9D3, steel
 * #9AA3AD) so the Android app stays consistent with the rest of the brand.
 */
export const colors = {
  ink: '#1C1C1E',
  inkSoft: '#3A3A3D',
  paper: '#F5F3EF',
  surface: '#FFFFFF',
  stone: '#DDD9D3',
  stoneSoft: '#ECE9E4',
  steel: '#9AA3AD',
  muted: '#6B7280',
  accent: '#E8590C',
  accentSoft: '#FDEBDD',
  success: '#2F7D4F',
  successSoft: '#E3F2E8',
  warning: '#B7791F',
  warningSoft: '#FBF0DA',
  danger: '#B42318',
  dangerSoft: '#FDE8E6',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

export const font = {
  caption: 12,
  small: 13,
  body: 15,
  bodyLarge: 16,
  title: 18,
  heading: 22,
  display: 28,
} as const;

export const shadow = {
  card: {
    shadowColor: '#1C1C1E',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
} as const;

/** Minimum touch target recommended by Android accessibility guidance. */
export const MIN_TOUCH = 48;
