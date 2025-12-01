/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#7C3AED',
          pink: '#EC4899',
          amber: '#F59E0B',
        },
      },
    },
  },
  plugins: [],
};
