// src/shared/theme/surfaces.ts
export const surfaces = {
  card: '#FFFFFF',
  cardAlt: '#F7F9FA',
  drawer: '#272932',
  overlay: 'rgba(39, 41, 50, 0.55)',
} as const;

export type Surfaces = typeof surfaces;
