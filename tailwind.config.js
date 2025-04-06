/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        'soft': '0 2px 15px rgba(0, 0, 0, 0.04)',
      },
      borderRadius: {
        'xl': '0.75rem',
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        lomirlite: {
          "primary": "#3B82F6",       // Brighter blue
          "primary-focus": "#2563EB", // Darker blue for hover states
          "primary-content": "#FFFFFF", // White text on primary
          "secondary": "#E0E7FF",     // Very light blue
          "secondary-focus": "#C7D2FE", // Slightly darker for hover
          "secondary-content": "#1E40AF", // Dark blue text on secondary
          "accent": "#6366F1",        // Indigo accent
          "neutral": "#3D4451",       // Dark gray
          "base-100": "#FFFFFF",      // White background
          "base-200": "#F8FAFC",      // Very light gray background
          "base-300": "#F1F5F9",      // Light gray for borders
          "base-content": "#1F2937",  // Dark text on base
          "info": "#38BDF8",          // Light blue for info
          "success": "#10B981",       // Green for success
          "warning": "#F59E0B",       // Amber for warnings
          "error": "#EF4444",         // Red for errors
        },
      },
      "light"
    ],
    defaultTheme: "lomirlite",
  },
}