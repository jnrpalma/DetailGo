import { Platform } from 'react-native';

const family = {
  regular: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: undefined,
  }),
  medium: Platform.select({
    ios: 'System',
    android: 'sans-serif-medium',
    default: undefined,
  }),
} as const;

export const typography = {
  family,
  size: {
    caption: 12,
    secondary: 14,
    body: 16,
    bodyLarge: 18,
    title: 20,
    titleLarge: 24,
    display: 28,
    displayLarge: 32,
  },
  lineHeight: {
    caption: 16,
    secondary: 20,
    body: 24,
    bodyLarge: 26,
    title: 28,
    titleLarge: 32,
    display: 38,
  },
} as const;
