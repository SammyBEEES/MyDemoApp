import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'settings.themeMode';
const MODES = ['system', 'light', 'dark'];

const lightColors = {
  background: '#f2f4f7',
  card: '#ffffff',
  cardAlt: '#f8fafc',
  text: '#0f172a',
  muted: '#64748b',
  border: '#cbd5e1',
  primary: '#2563eb',
  primaryText: '#ffffff',
  inputBg: '#ffffff',
  shadow: '#0f172a',
  overlay: 'rgba(15, 23, 42, 0.45)',
  success: '#15803d',
  thumb: '#e2e8f0',
};

const darkColors = {
  background: '#0b0f16',
  card: '#161b24',
  cardAlt: '#1d2430',
  text: '#f1f5f9',
  muted: '#94a3b8',
  border: '#3b4656',
  primary: '#60a5fa',
  primaryText: '#0b0f16',
  inputBg: '#111720',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.65)',
  success: '#4ade80',
  thumb: '#232b37',
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState('system');

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (active && MODES.includes(stored)) setModeState(stored);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const setMode = (next) => {
    if (!MODES.includes(next)) return;
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  };

  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const value = useMemo(
    () => ({ mode, setMode, isDark, colors }),
    [mode, isDark, colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
