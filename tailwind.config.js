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
      gridTemplateColumns: {
        '3': 'repeat(3, minmax(0, 1fr))',
      },
      colors: {
        softviolet: '#C7D2FE', // Add your soft violet color here
      },
    },
    screens: {
      'xs': '375px', 
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
          "primary": "var(--color-primary)",
          "primary-focus": "var(--color-primary-focus)",
          "primary-content": "var(--color-primary-content)",

          "secondary": "#E0E7FF",
          "secondary-focus": "#C7D2FE",
          "secondary-content": "var(--color-primary-focus)",

          "accent": "#C7D2FE",
          "neutral": "#3D4451",

          "base-100": "var(--color-background)",
          "base-200": "var(--color-background-soft)",
          "base-300": "#F1F5F9",
          "base-content": "var(--color-text)",

          "info": "var(--color-info)",
          "success": "var(--color-success)",
          "warning": "var(--color-warning)",
          "error": "var(--color-error)",

          "font-family": "'Roboto', sans-serif",
          "text-primary": "var(--color-primary-focus)",
        },
      },

        /* Commented out old custom theme
      {
        lomirlite: {
          "primary": "#3B82F6",           // blue
          "primary-focus": "#009213",     // darker blue
          "primary-content": "#FFFFFF",

          "secondary": "#E0E7FF",         // soft violet-light
          "secondary-focus": "#C7D2FE",   // soft violet
          "secondary-content": "#1E40AF", // navy

          "accent": "#C7D2FE",            // replacing magenta with soft violet
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
      */
    ],
    defaultTheme: "lomirlite",
  },
}