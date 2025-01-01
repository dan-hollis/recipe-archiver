/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          light: '#f0f0f0',
          dark: '#333',
        },
        text: {
          light: '#333',
          dark: '#f0f0f0',
        },
        card: {
          bg: {
            light: '#fff',
            dark: '#444',
          },
          text: {
            light: '#666',
            dark: '#ccc',
          },
        },
      },
    },
  },
  plugins: [],
}