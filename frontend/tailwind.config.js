/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        paper: "#FBF9F6",
        elevated: "#F4F1EC",
        forest: {
          50: "#EEF2EF",
          100: "#D7E0DA",
          200: "#A8B9AD",
          300: "#7E957F",
          400: "#5C7A60",
          500: "#3F5E4A",
          600: "#324E3D",
          700: "#2C4A3B",
          800: "#23382C",
          900: "#1F2924",
        },
        sage: {
          DEFAULT: "#8E9E90",
          50: "#F1F4F1",
          100: "#DEE5DF",
          200: "#BFCCC1",
          300: "#A2B2A4",
          400: "#8E9E90",
          500: "#768C72",
        },
        sand: {
          DEFAULT: "#DBCFB0",
          50: "#FBF7EE",
          100: "#F2EBD6",
          200: "#E6DCBC",
          300: "#DBCFB0",
          400: "#C7B98E",
        },
        terracotta: {
          DEFAULT: "#C36B58",
          50: "#FAEEEA",
          100: "#F1D5CC",
          200: "#E0A696",
          300: "#C36B58",
          400: "#A55241",
        },
        stone: {
          50: "#FBF9F6",
          100: "#F4F1EC",
          200: "#E5DFD6",
          300: "#C9C2B5",
          400: "#A29C90",
          500: "#8A928D",
          600: "#575E5A",
          700: "#3E4441",
          800: "#2A302D",
          900: "#1F2924",
        },
      },
      fontFamily: {
        serif: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.7' } },
      },
    },
  },
  plugins: [],
};
