/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0f0f0f',
        surface: '#1a1a1a',
        border: '#2a2a2a',
        amber: '#f59e0b',
        'amber-hover': '#d97706',
        'blue-accent': '#3b82f6',
        'text-primary': '#f5f5f5',
        'text-secondary': '#9ca3af',
        'green-lead': '#34d399',
        'red-lead': '#f87171',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
