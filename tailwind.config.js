import daisyui from "daisyui";
import daisyuiTheme from "daisyui/theme/index.js";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Roboto", "sans-serif"],
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        card: "var(--shadow-card)",
      },
      borderRadius: {
        xl: "0.75rem",
      },
      gridTemplateColumns: {
        3: "repeat(3, minmax(0, 1fr))",
        4: "repeat(4, minmax(0, 1fr))",
      },
      colors: {
        // Add custom colors here

        // CSS Variable based colors for direct use in Tailwind classes
        primary: "var(--color-primary)",
        "primary-focus": "var(--color-primary-focus)",
        "primary-content": "var(--color-primary-content)",

        // Badge colors
        "badge-collaboration": "var(--color-badge-collaboration)",
        "badge-technical": "var(--color-badge-technical)",
        "badge-creative": "var(--color-badge-creative)",
        "badge-leadership": "var(--color-badge-leadership)",
        "badge-personal": "var(--color-badge-personal)",

        // UI colors
        background: "var(--color-background)",
        "background-soft": "var(--color-background-soft)",
        "background-muted": "var(--color-background-muted)",
        text: "var(--color-text)",
        "text-soft": "var(--color-text-soft)",
        border: "var(--color-border)",

        // Semantic colors
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        error: "var(--color-error)",
        info: "var(--color-info)",
      },
      transitionDuration: {
        fast: "var(--transition-speed-fast)",
        normal: "var(--transition-speed-normal)",
        slow: "var(--transition-speed-slow)",
      },
    },
    screens: {
      xs: "375px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
  },
  plugins: [
    daisyui({
      // Dark mode is intentionally suspended for now.
      // Ship only DaisyUI's light theme so it does not generate a prefers-color-scheme dark override.
      // Revisit this when a tested, accessible dark theme is ready to ship.
      themes: ["light --default"],
    }),
    daisyuiTheme({
      // Preserve the existing Lomir light palette while dark mode is suspended.
      // We override DaisyUI's built-in light theme instead of using a separate dark-enabled theme setup.
      name: "light",
      default: true,
      prefersdark: false,
      "color-scheme": "only light",
      "--color-base-100": "#ffffff",
      "--color-base-200": "#f8fafc",
      "--color-base-300": "#F1F5F9",
      "--color-base-content": "#033f05",
      "--color-primary": "#009213",
      "--color-primary-content": "#ffffff",
      "--color-secondary": "#bbeabf",
      "--color-secondary-content": "#036b0c",
      "--color-accent": "#7ace82",
      "--color-neutral": "#3D4451",
      "--color-info": "#766aea",
      "--color-info-content": "#ffffff",
      "--color-success": "#009213",
      "--color-success-content": "#ffffff",
      "--color-warning": "#df385b",
      "--color-warning-content": "#ffffff",
      "--color-error": "#df385b",
      "--color-error-content": "#ffffff",
    }),
  ],
};
