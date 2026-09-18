/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        studio: {
          bg: '#0c0d12',
          card: '#141721',
          surface: '#1a1e2d',
          border: '#262c3f',
          hover: '#2d344b',
          accent: '#3b82f6',
          accentHover: '#2563eb',
          neon: '#06b6d4',
          beat: '#eab308',
          beatStrong: '#ef4444',
          beatCustom: '#a855f7',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
