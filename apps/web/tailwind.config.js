/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf4f3',
          100: '#fce8e6',
          200: '#f9d5d2',
          300: '#f3b5ae',
          400: '#ea8c82',
          500: '#dc6457',
          600: '#c84a3c',
          700: '#a83b2e',
          800: '#8c3429',
          900: '#763028',
          950: '#401510',
        },
      },
    },
  },
  plugins: [],
};
