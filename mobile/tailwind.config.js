/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('nativewind/preset')],
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#D4A373",
        "cream-bg": "#FDFCF0",
        "off-white": "#FFFFFF",
        "soft-cream": "#FAEDCD",
        "accent-text": "#795548",
        "border-color": "#E9EDC9",
      },
      borderRadius: {
        DEFAULT: "16px",
        lg: "24px",
        xl: "32px",
        full: "9999px",
      },
    },
  },
  plugins: [],
};
