/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#2c3e50',
          accent: '#3498db',
        },
      },
    },
  },
  plugins: [],
}
