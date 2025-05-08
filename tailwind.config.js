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
        'soft': 'var(--shadow-soft)',
        'card': 'var(--shadow-card)',
      },
      borderRadius: {
        'xl': '0.75rem',
      },
      gridTemplateColumns: {
        '3': 'repeat(3, minmax(0, 1fr))',
      },
      colors: {
        // Add custom colors here
        
        
        // CSS Variable based colors for direct use in Tailwind classes
        'primary': 'var(--color-primary)',
        'primary-focus': 'var(--color-primary-focus)',
        'primary-content': 'var(--color-primary-content)',
        
        // Badge colors
        'badge-collaboration': 'var(--color-badge-collaboration)',
        'badge-technical': 'var(--color-badge-technical)',
        'badge-creative': 'var(--color-badge-creative)',
        'badge-leadership': 'var(--color-badge-leadership)',
        'badge-personal': 'var(--color-badge-personal)',
        
        // UI colors
        'background': 'var(--color-background)',
        'background-soft': 'var(--color-background-soft)',
        'background-muted': 'var(--color-background-muted)',
        'text': 'var(--color-text)',
        'text-soft': 'var(--color-text-soft)',
        'border': 'var(--color-border)',
        
        // Semantic colors
        'success': 'var(--color-success)',
        'warning': 'var(--color-warning)',
        'error': 'var(--color-error)',
        'info': 'var(--color-info)',
      },
      transitionDuration: {
        'fast': 'var(--transition-speed-fast)',
        'normal': 'var(--transition-speed-normal)',
        'slow': 'var(--transition-speed-slow)',
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

          "secondary": "#bbeabf",
          "secondary-focus": "#7ace82",
          "secondary-content": "var(--color-primary-focus)",

          "accent": "#7ace82",
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
      // Optional: Add a dark theme version here for future use
      /* Uncomment when dark mode is implemented
      {
        lomirdark: {
          "primary": "var(--color-primary)",
          "primary-focus": "var(--color-primary-focus)",
          "primary-content": "var(--color-primary-content)",

          "secondary": "#262B42",
          "secondary-focus": "#1F2235",
          "secondary-content": "var(--color-primary-content)",

          "accent": "#373F67",
          "neutral": "#1A1E2C",

          "base-100": "#1C1F2E",
          "base-200": "#16192A",
          "base-300": "#131625",
          "base-content": "#EAEDF6",

          "info": "var(--color-info)",
          "success": "var(--color-success)",
          "warning": "var(--color-warning)",
          "error": "var(--color-error)",

          "font-family": "'Roboto', sans-serif",
          "text-primary": "var(--color-primary-focus)",
        },
      },
      */
    ],
    defaultTheme: "lomirlite",
  },
}