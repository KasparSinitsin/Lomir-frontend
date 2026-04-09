import { useState, useEffect } from 'react';
import Colors from '../utils/Colors';

/**
 * Hook for theme management throughout the application
 * Provides access to colors and theme utilities
 */
export function useTheme() {
  // Keep the app in DaisyUI's light theme until the accessible dark mode is implemented.
  const [theme, setTheme] = useState('light');
  
  // Function to set a custom CSS variable at runtime
  const setCustomColor = (name, value) => {
    document.documentElement.style.setProperty(`--${name}`, value);
  };
  
  // Function to get a CSS variable value
  const getCustomColor = (name) => {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(`--${name}`).trim();
  };
  
  // Dark mode is intentionally suspended until the proper accessible theme is ready.
  // Keep this light-only safeguard in place until the future dark theme is fully implemented.
  const toggleTheme = () => {
    setTheme('light');
    document.documentElement.setAttribute('data-theme', 'light');
  };
  
  // Initialize theme on component mount
  useEffect(() => {
    // You could load theme from localStorage here
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  
  return {
    theme,
    colors: Colors,
    setTheme,
    toggleTheme,
    setCustomColor,
    getCustomColor
  };
}
