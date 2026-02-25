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

/**
 * Firebase paths (apenas os que não estão em outros lugares)
 */
export const FIREBASE_PATHS = {
  SETTINGS: 'settings/shop',
} as const;
