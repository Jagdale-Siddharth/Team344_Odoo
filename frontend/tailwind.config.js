/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        odoo: {
          DEFAULT: '#714B67',
          dark: '#5b3a53',
          light: '#8f6382',
        },
      },
    },
  },
  plugins: [],
};
