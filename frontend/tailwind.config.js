/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          dark: '#1D4ED8',
          light: '#DBEAFE',
          bg: '#EFF6FF',
        },
        navy: {
          DEFAULT: '#1E3A8A',
          dark: '#172554',
          light: '#1E40AF',
        },
        appbg: '#F8FAFC',
        bordercolor: '#E2E8F0',
        health: {
          dark: '#1E3A8A',     // Deep Navy
          darker: '#172554',   // Very Deep Navy
          primary: '#2563EB',  // Primary Blue
          mint: '#2563EB',     // Replaced with Blue
          mintlight: '#EFF6FF',// Very Light Blue
          mintbg: '#EFF6FF',   // Very Light Blue
          accent: '#1D4ED8',   // Dark Blue
          alert: '#DC2626'     // Error Red
        }
      }
    },
  },
  plugins: [],
}
