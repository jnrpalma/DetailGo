// src/shared/theme/borders.ts
export const borders = {
  default: '#C9D6DF',
  focus: '#0F7173',
  error: '#F05D5E',
  light: '#E2E8F0',
} as const;

export type Borders = typeof borders;