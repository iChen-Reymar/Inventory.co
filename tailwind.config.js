/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-blue': '#4a90e2',
        'dark-bg': '#2c2c2c',
      },
    },
  },
  plugins: [],
}




