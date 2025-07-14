import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, StatusBar } from 'react-native';
import { lightTheme, darkTheme, getThemeColors } from '../constants/DesignTokens';

interface ThemeContextType {
  isDark: boolean;
  theme: typeof lightTheme;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize theme from storage or system preference
  useEffect(() => {
    const initializeTheme = async () => {
      try {
        // First check if user has a saved preference
        const savedTheme = await AsyncStorage.getItem('theme_preference');
        
        if (savedTheme !== null) {
          const isDarkPreference = savedTheme === 'dark';
          setIsDark(isDarkPreference);
        } else {
          // Fall back to system preference
          const systemColorScheme = Appearance.getColorScheme();
          setIsDark(systemColorScheme === 'dark');
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
        // Fall back to system preference
        const systemColorScheme = Appearance.getColorScheme();
        setIsDark(systemColorScheme === 'dark');
      } finally {
        setIsInitialized(true);
      }
    };

    initializeTheme();
  }, []);

  // Listen to system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      // Only auto-update if user hasn't set a manual preference
      AsyncStorage.getItem('theme_preference').then((savedTheme) => {
        if (savedTheme === null) {
          setIsDark(colorScheme === 'dark');
        }
      });
    });

    return () => subscription?.remove();
  }, []);

  // Update status bar when theme changes
  useEffect(() => {
    if (isInitialized) {
      StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true);
    }
  }, [isDark, isInitialized]);

  const toggleTheme = async () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    
    try {
      await AsyncStorage.setItem('theme_preference', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const setTheme = async (darkMode: boolean) => {
    setIsDark(darkMode);
    
    try {
      await AsyncStorage.setItem('theme_preference', darkMode ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const theme = getThemeColors(isDark);

  const contextValue: ThemeContextType = {
    isDark,
    theme,
    toggleTheme,
    setTheme,
  };

  // Don't render anything until theme is initialized
  if (!isInitialized) {
    return null;
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 