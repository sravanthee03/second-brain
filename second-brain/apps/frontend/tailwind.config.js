/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f6fbff',
          100: '#e8f4ff',
          500: '#2b6ef6',
        }
      }
    },
  },
  plugins: [],
};
