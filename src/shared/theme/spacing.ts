// src/shared/theme/spacing.ts
export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
} as const;

export type Spacing = typeof spacing;