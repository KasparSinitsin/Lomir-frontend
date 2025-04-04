/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,css}",
  ],
  
  theme: {
    extend: {
      // You can add custom colors here if needed
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        lomirlite: {
          "primary": "#3B82F6",       // Blue for primary actions
          "secondary": "#E0E7FF",     // Light blue for secondary elements
          "accent": "#6366F1",        // Indigo for accent elements
          "neutral": "#3D4451",       // Dark gray for neutral text
          "base-100": "#FFFFFF",      // White background
          "base-200": "#F8FAFC",      // Very light gray for alternate backgrounds
          "base-300": "#F1F5F9",      // Light gray for borders and dividers
          "info": "#38BDF8",          // Light blue for info messages
          "success": "#10B981",       // Green for success messages
          "warning": "#F59E0B",       // Amber for warnings
          "error": "#EF4444",         // Red for errors
        },
      },
      "light",
    ],
    defaultTheme: "lomirlite",
  },
}