/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#05070B',
          900: '#080B11',
          800: '#0E1420',
          700: '#161F32',
          600: '#232F46',
        },
        cyan: {
          400: '#00F0FF',
          500: '#00D4E2',
          600: '#00A8B5',
          900: '#02383E',
        },
        terracotta: {
          400: '#FF705C',
          500: '#E05A47',
          600: '#B83E2D',
          900: '#4A150E',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        heading: ['"Space Grotesk"', 'Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'heartbeat': 'heartbeat 1s ease-in-out infinite',
        'scanline': 'scanline 4s linear infinite',
      },
      keyframes: {
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '15%': { transform: 'scale(1.25)' },
          '30%': { transform: 'scale(1)' },
          '45%': { transform: 'scale(1.15)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
      },
    },
  },
  plugins: [],
}

