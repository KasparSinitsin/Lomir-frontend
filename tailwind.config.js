/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px rgba(0, 0, 0, 0.04)',
      },
      borderRadius: {
        'xl': '0.75rem',
      },
    },
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        lomirlite: {
          "primary": "#3B82F6",
          "primary-focus": "#2563EB",
          "primary-content": "#FFFFFF",
          "secondary": "#E0E7FF",
          "secondary-focus": "#C7D2FE",
          "secondary-content": "#1E40AF",
          "accent": "#6366F1",
          "neutral": "#3D4451",
          "base-100": "#FFFFFF",
          "base-200": "#F8FAFC",
          "base-300": "#F1F5F9",
          "base-content": "#1F2937",
          "info": "#38BDF8",
          "success": "#10B981",
          "warning": "#F59E0B",
          "error": "#EF4444",
          "font-family": "'Roboto', sans-serif",
        },
      },
      "light"
    ],
    defaultTheme: "lomirlite",
  },
}