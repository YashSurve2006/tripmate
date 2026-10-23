import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance, ColorSchemeName, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryMuted: string;
  primaryGradient: readonly [string, string];
  indigo: string;
  blue: string;
  blueLight: string;
  blueMuted: string;
  teal: string;
  coral: string;
  positive: string;
  positiveDark: string;
  positiveMuted: string;
  positiveText: string;
  negative: string;
  negativeDark: string;
  negativeMuted: string;
  negativeText: string;
  warning: string;
  warningMuted: string;
  warningText: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceElevated: string;
  card: string;
  border: string;
  borderLight: string;
  inputBg: string;
  inputBorder: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  textSubtle: string;
  textInverse: string;
  placeholder: string;
  accentTeal: string;
  overlay: string;
  modalBg: string;
  statusBar: 'light-content' | 'dark-content';
}

export const LightColors: ThemeColors = {
  primary: '#7C3AED',
  primaryLight: '#8B5CF6',
  primaryDark: '#6D28D9',
  primaryMuted: '#EDE9FE',
  primaryGradient: ['#7C3AED', '#6366F1'] as const,
  indigo: '#4F46E5',
  blue: '#3B82F6',
  blueLight: '#60A5FA',
  blueMuted: '#EFF6FF',
  teal: '#0D9488',
  coral: '#F43F5E',
  positive: '#10B981',
  positiveDark: '#059669',
  positiveMuted: '#D1FAE5',
  positiveText: '#065F46',
  negative: '#EF4444',
  negativeDark: '#DC2626',
  negativeMuted: '#FEE2E2',
  negativeText: '#991B1B',
  warning: '#F59E0B',
  warningMuted: '#FEF3C7',
  warningText: '#92400E',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  surfaceElevated: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  inputBg: '#F8FAFC',
  inputBorder: '#CBD5E1',
  text: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  textMuted: '#64748B',
  textSubtle: '#94A3B8',
  textInverse: '#FFFFFF',
  placeholder: '#94A3B8',
  accentTeal: '#0D9488',
  overlay: 'rgba(15, 23, 42, 0.5)',
  modalBg: '#FFFFFF',
  statusBar: 'dark-content',
};

export const DarkColors: ThemeColors = {
  primary: '#8B5CF6',
  primaryLight: '#A78BFA',
  primaryDark: '#7C3AED',
  primaryMuted: '#2E1065',
  primaryGradient: ['#8B5CF6', '#6366F1'] as const,
  indigo: '#6366F1',
  blue: '#60A5FA',
  blueLight: '#93C5FD',
  blueMuted: '#1E293B',
  teal: '#14B8A6',
  coral: '#FB7185',
  positive: '#34D399',
  positiveDark: '#10B981',
  positiveMuted: '#064E3B',
  positiveText: '#6EE7B7',
  negative: '#F87171',
  negativeDark: '#EF4444',
  negativeMuted: '#7F1D1D',
  negativeText: '#FCA5A5',
  warning: '#FBBF24',
  warningMuted: '#78350F',
  warningText: '#FDE68A',
  background: '#0B0F19',
  surface: '#131B2E',
  surfaceAlt: '#1A233A',
  surfaceElevated: '#1E2942',
  card: '#131B2E',
  border: '#232F4D',
  borderLight: '#1A233A',
  inputBg: '#0F172A',
  inputBorder: '#334155',
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textTertiary: '#64748B',
  textMuted: '#94A3B8',
  textSubtle: '#64748B',
  textInverse: '#0F172A',
  placeholder: '#64748B',
  accentTeal: '#14B8A6',
  overlay: 'rgba(0, 0, 0, 0.75)',
  modalBg: '#131B2E',
  statusBar: 'light-content',
};

interface ThemeContextType {
  colors: ThemeColors;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const THEME_STORAGE_KEY = '@tripmate:theme_preference';

const ThemeContext = createContext<ThemeContextType>({
  colors: LightColors,
  isDark: false,
  themeMode: 'system',
  setThemeMode: async () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setThemeModeState(saved);
      }
      setIsReady(true);
    });
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  };

  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');
  const colors = isDark ? DarkColors : LightColors;

  return (
    <ThemeContext.Provider value={{ colors, isDark, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
