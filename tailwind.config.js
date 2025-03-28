/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Add custom colors or themes here
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["light", "dark"], // You can specify themes you want to use
  }
}