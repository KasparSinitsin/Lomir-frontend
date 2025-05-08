import { useState, useEffect } from 'react';
import Colors from '../utils/Colors';

/**
 * Hook for theme management throughout the application
 * Provides access to colors and theme utilities
 */
export function useTheme() {
  // Get the current theme (for future dark/light mode toggle)
  const [theme, setTheme] = useState('lomirlite');
  
  // Function to set a custom CSS variable at runtime
  const setCustomColor = (name, value) => {
    document.documentElement.style.setProperty(`--${name}`, value);
  };
  
  // Function to get a CSS variable value
  const getCustomColor = (name) => {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(`--${name}`).trim();
  };
  
  // Toggle between themes (for future implementation)
  const toggleTheme = () => {
    const newTheme = theme === 'lomirlite' ? 'lomirdark' : 'lomirlite';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    // You could load different CSS variable values here
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