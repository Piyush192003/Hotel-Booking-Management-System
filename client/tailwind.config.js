/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Emerald → teal tropical brand scale (primary CTA #148a6f, deep emerald #0d5c48)
        brand: {
          50: '#ecf8f3',
          100: '#d3f0e3',
          200: '#a9e1cd',
          300: '#74cdb1',
          400: '#3fb295',
          500: '#21977f',
          600: '#1a7a6a',
          700: '#0d5c48',
          800: '#0a4a3a',
          900: '#093d31',
          950: '#052a22',
        },
        // Warm sand / cream — coastal resort neutrals
        sand: {
          50: '#fdfcf9',
          100: '#faf6ee',
          200: '#f4ecdd',
          300: '#eadfc7',
          400: '#dcc9a6',
          500: '#c9ad80',
          600: '#b4915f',
          700: '#9a784c',
          800: '#806140',
          900: '#6a5037',
          950: '#3c2e1f',
        },
        // Warm olive-charcoal ink for text & borders
        ink: {
          50: '#f7f6f4',
          100: '#eceae5',
          200: '#d9d5cd',
          300: '#b8b3a7',
          400: '#928c7e',
          500: '#736d60',
          600: '#5a554a',
          700: '#47433a',
          800: '#39362f',
          900: '#262420',
          950: '#161410',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Fraunces"', '"Plus Jakarta Sans"', 'Georgia', 'serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(13,92,72,.05), 0 6px 20px -6px rgba(13,92,72,.10)',
        float: '0 20px 45px -18px rgba(13,92,72,.22)',
        'brand-glow': '0 8px 24px -8px rgba(26,122,106,.55)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #0d5c48 0%, #1a7a6a 55%, #21977f 100%)',
        'hero-gradient': 'linear-gradient(105deg, rgba(9,61,49,.78) 0%, rgba(9,61,49,.45) 40%, rgba(13,92,72,.18) 75%, rgba(13,92,72,.08) 100%)',
        'sand-wash': 'linear-gradient(180deg, #faf6ee 0%, #f4ecdd 100%)',
      },
    },
  },
  plugins: [],
};