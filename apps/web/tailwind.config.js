/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'Cambria', 'serif'],
      },
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
        // Warm antique-gold accent for eyebrows, hairlines and luxury detailing
        gold: {
          50: '#fbf7ef',
          100: '#f5ecd7',
          200: '#e9d5a8',
          300: '#dcbb75',
          400: '#cfa24f',
          500: '#c08a34',
          600: '#a56f29',
          700: '#845423',
          800: '#6e4622',
          900: '#5e3c20',
        },
        // Warm neutral canvas
        cream: '#faf7f2',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
        marquee: 'marquee 32s linear infinite',
      },
    },
  },
  plugins: [],
};
