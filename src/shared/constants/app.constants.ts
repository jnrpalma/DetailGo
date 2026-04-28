/**
 * Configurações de UI
 */
export const UI = {
  // Tamanhos de avatar
  AVATAR_SIZE: 96,

  // Alturas
  COVER_HEIGHT: 285,

  // Menu/Drawer
  MENU_WIDTH: 280,
  DRAWER_ANIMATION_DURATION: 250,

  // Espaçamentos padrão (caso não use o theme)
  PADDING: {
    SMALL: 8,
    MEDIUM: 16,
    LARGE: 24,
  },
} as const;

/**
 * Configurações de cache
 */
export const CACHE = {
  USER_NAME_TTL: 5 * 60 * 1000, // 5 minutos
} as const;

export const FIREBASE_PATHS = {
  shopSettings: (shopId: string) => `shops/${shopId}/settings/config`,
  shopAppointments: (shopId: string) => `shops/${shopId}/appointments`,
} as const;
