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
        // ── Brand accent — Deep Burgundy / Oxblood ─────────────────────────
        // 600 = Burgundy #7A1F2B (primary), 800 = Oxblood #54151E (dark).
        // An accent, never a page background. See design tokens in globals.css.
        primary: {
          50: '#fbf3f4',
          100: '#f6e2e4',
          200: '#eec7cb',
          300: '#df9ea5',
          400: '#c96b76',
          500: '#a83e4b',
          600: '#7a1f2b',
          700: '#661a24',
          800: '#54151e',
          900: '#451219',
          950: '#26090d',
        },
        // ── Champagne Gold — subtle premium detailing only ─────────────────
        // 400 = Champagne #C6A15B. Used for eyebrows, hairlines, fine accents.
        gold: {
          50: '#faf6ee',
          100: '#f3e9d3',
          200: '#e7d3a9',
          300: '#d7ba7e',
          400: '#c6a15b',
          500: '#b58a45',
          600: '#98713a',
          700: '#795a31',
          800: '#63492c',
          900: '#533d27',
        },
        // ── Rosewood — muted mauve for cards/panels layered ON burgundy ─────
        // Used sparingly on dark heritage bands (ref: inner-circle / testimonial
        // cards). Never as a page background.
        rosewood: {
          50: '#f7eef0',
          100: '#eddadd',
          200: '#dcb8bd',
          300: '#c8949c',
          400: '#b0717b',
          500: '#985761',
          600: '#7f454f',
          700: '#663843',
        },
        // ── Warm neutrals (the 60% + 30% of the palette) ───────────────────
        ivory: '#faf7f2', // Warm Ivory — primary background
        sand: '#f3ede4', // Soft Cream — surface / secondary background
        espresso: '#211c19', // primary text
        warmgray: '#6f6862', // secondary text
        line: '#ded2c3', // soft warm border
        // Back-compat alias for existing `bg-cream` usages
        cream: '#faf7f2',
      },
      borderColor: {
        // Bare `border` / `border-t` / `border-y` resolve to the soft warm line,
        // so surfaces are separated by hairlines rather than cool gray.
        DEFAULT: '#ded2c3',
      },
      boxShadow: {
        // Restrained, warm-tinted elevation — luxury prefers borders over shadow.
        soft: '0 1px 2px 0 rgba(33, 28, 25, 0.04)',
        card: '0 8px 30px -12px rgba(33, 28, 25, 0.12)',
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
