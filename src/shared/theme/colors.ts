// src/shared/theme/colors.ts
export const colors = {
  primary: {
    main: '#0F7173',
    light: '#E6F3F5',
    dark: '#0A4D68',
  },
  secondary: {
    main: '#4BA3C3',
    light: '#E6F3F5',
  },
  status: {
    success: '#16A34A',
    warning: '#2563EB',
    error: '#F05D5E',
    disabled: '#94A3B8',
  },
  text: {
    primary: '#272932',
    secondary: '#4B5563',
    tertiary: '#6B7280',
    disabled: '#9CA3AF',
    white: '#FFFFFF',
  },
  background: {
    main: '#E7ECEF',
    surface: '#F7F9FA',
    card: '#FFFFFF',
    drawer: '#272932',
  },
  border: {
    main: '#C9D6DF',
    focus: '#0F7173',
    error: '#F05D5E',
    light: '#E2E8F0',
  },
  overlay: 'rgba(39, 41, 50, 0.55)',
} as const;

export type ColorPalette = typeof colors;