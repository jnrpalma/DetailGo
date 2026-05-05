import React, { createContext, useContext, useMemo, useState } from 'react';

import { darkColors, lightColors, type AppColors } from './colors';

export type ThemeMode = 'dark' | 'light';

type ThemeContextValue = {
  mode: ThemeMode;
  colors: AppColors;
  isLight: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');

  const value = useMemo<ThemeContextValue>(() => {
    const isLight = mode === 'light';
    return {
      mode,
      colors: isLight ? lightColors : darkColors,
      isLight,
      setMode,
      toggleTheme: () => setMode(current => (current === 'light' ? 'dark' : 'light')),
    };
  }, [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme deve ser usado dentro de ThemeProvider');
  }

  return context;
}
