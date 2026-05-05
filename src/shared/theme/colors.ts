// ─────────────────────────────────────────────────────────────────────────────
// DETAILGO — Sistema de cores centralizado
//
// Duas paletas:
//   colors      → Heritage Teal (telas admin e cliente ainda não redesenhadas)
//   darkColors  → Garage Dark   (novo redesign — Login, Register e futuras telas)
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. Heritage Teal ─────────────────────────────────────────────────────────
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

// ── 2. Garage Dark ───────────────────────────────────────────────────────────
// Paleta do novo redesign — escuro, neon amarelo-verde, acento laranja
export const darkColors = {
  // Fundos
  bg: '#0B0D0E', // fundo principal — quase preto
  surface: '#121517', // superfície intermediária
  card: '#191D20', // cards e inputs

  // Texto
  ink: '#F5F7F8', // texto principal — branco suave
  ink2: '#A8B0B4', // texto secundário — cinza claro
  ink3: '#6B7378', // texto terciário / labels / placeholders

  // Cor primária — verde-neon
  primary: '#D4FF3D',
  primaryDark: '#B6E300',
  primaryLight: 'rgba(212,255,61,0.12)',
  onPrimary: '#050708',

  // Borda
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.15)',
  borderFocus: 'rgba(212,255,61,0.45)',

  // Acento — laranja-vermelho (erros, cancelamentos)
  accent: '#FF5C39',

  // Status
  status: {
    success: '#22C55E',
    error: '#FF5C39',
    warning: '#F59E0B',
    info: '#3B82F6',
  },

  // Overlay
  overlay: 'rgba(0,0,0,0.65)',
} as const;

export type DarkColorPalette = typeof darkColors;
export type AppColors = {
  readonly [Key in keyof typeof darkColors]: Key extends 'status'
    ? { readonly [StatusKey in keyof typeof darkColors.status]: string }
    : string;
};

// 3. Garage Light
// Tema claro do redesign: limpo, frio e com contraste suave.
export const lightColors = {
  bg: '#F7FAF9',
  surface: '#EEF5F2',
  card: '#FFFFFF',

  ink: '#182326',
  ink2: '#516268',
  ink3: '#86979D',

  primary: '#2F6F7E',
  primaryDark: '#245A66',
  primaryLight: 'rgba(47,111,126,0.12)',
  onPrimary: '#FFFFFF',

  border: 'rgba(24,35,38,0.08)',
  borderStrong: 'rgba(24,35,38,0.14)',
  borderFocus: 'rgba(47,111,126,0.38)',

  accent: '#E3523B',

  status: {
    success: '#2F7D59',
    error: '#E3523B',
    warning: '#B7791F',
    info: '#2F6F7E',
  },

  overlay: 'rgba(24,35,38,0.34)',
} as const;

export type LightColorPalette = typeof lightColors;
