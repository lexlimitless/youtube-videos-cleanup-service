/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        emerald: {
          DEFAULT: '#077848',
          50: '#e6f4ef',
          100: '#cce9df',
          200: '#99d3bf',
          300: '#66bda0',
          400: '#33a780',
          500: '#077848', // main accent
          600: '#066a3f',
          700: '#055c36',
          800: '#044e2d',
          900: '#034024',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      fontFamily: {
        sans: ['Open Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 8px 0 rgba(16, 24, 40, 0.06)',
      },
    },
  },
  plugins: [],
};
