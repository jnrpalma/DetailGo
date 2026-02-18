export const APPOINTMENT = {
  NO_SHOW_GRACE_MIN: 15,
  NO_SHOW_GRACE_MS: 15 * 60 * 1000,
  DEFAULT_LIMIT: 50,
  MAX_CAPACITY: 10,
} as const;

export const FIREBASE_PATHS = {
  SETTINGS: 'settings/shop',
  APPOINTMENTS: 'appointments',
  USERS: 'users',
} as const;

export const STATUS = {
  ACTIVE: ['scheduled', 'in_progress'] as const,
  HISTORY: ['done', 'no_show'] as const,
} as const;

export const APPOINTMENT_STATUS = {
  ACTIVE: ['scheduled', 'in_progress'] as const,
  HISTORY: ['done', 'no_show'] as const,
} as const;

export const CAR_CATEGORIES = [
  'Hatch',
  'Sedan',
  'SUV',
  'Picape cabine dupla',
] as const;

export const VEHICLE_TYPES = ['Carro', 'Moto'] as const;

export const UI = {
  AVATAR_SIZE: 96,
  COVER_HEIGHT: 285,
  MENU_WIDTH: 280,
  DRAWER_ANIMATION_DURATION: 250,
} as const;
