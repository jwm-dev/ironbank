/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Commonwealth flag colors (from actual flag PNG)
        cw: {
          gold: {
            50: '#FEF9E7',
            100: '#FDF0C3',
            200: '#FBE49D',
            300: '#F8D777',
            400: '#F5C94E',
            500: '#F1AF15', // Primary gold from flag
            600: '#D99A0E',
            700: '#B3800C',
            800: '#8D650A',
            900: '#674A07',
          },
          blue: {
            50: '#E9F4FA',
            100: '#C7E2F2',
            200: '#A2CEE9',
            300: '#6FB5DC',
            400: '#4AA1D2',
            500: '#2489C7', // Primary blue from flag
            600: '#1E74A8',
            700: '#185F89',
            800: '#124A6A',
            900: '#0D354B',
          },
          white: '#FFFFFF',
          cream: '#F5F5DC',
        },
        // Dark theme base
        dark: {
          50: '#374151',
          100: '#1F2937',
          200: '#1A1F2E',
          300: '#151A27',
          400: '#111520',
          500: '#0D1017',
          600: '#090C11',
          700: '#06080C',
          800: '#030407',
          900: '#000000',
        }
      },
      fontFamily: {
        minecraft: ['"Minecraft"', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'cw-gradient': 'linear-gradient(135deg, #2489C7 0%, #0D1017 50%, #F1AF15 100%)',
        'gold-shimmer': 'linear-gradient(90deg, #F1AF15 0%, #F8D777 50%, #F1AF15 100%)',
      }
    },
  },
  plugins: [],
}
