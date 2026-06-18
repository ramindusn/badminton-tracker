/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // "Clean Court" theme: one teal accent on a neutral base. The neutral
      // tokens (bg/surface/line/fg) are backed by CSS variables in index.css so
      // they flip for dark mode; the teal accent and vivid money/badge colors
      // (emerald/red/amber/teal/purple) stay constant and read on both themes.
      colors: {
        accent: {
          DEFAULT: '#0EA5A4',
          hover: '#0D9488',
        },
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          muted: 'rgb(var(--surface-muted) / <alpha-value>)',
        },
        line: 'rgb(var(--border) / <alpha-value>)',
        fg: {
          DEFAULT: 'rgb(var(--fg) / <alpha-value>)',
          muted: 'rgb(var(--fg-muted) / <alpha-value>)',
          subtle: 'rgb(var(--fg-subtle) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
