/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'whatsapp-green': '#25D366',
        'whatsapp-green-dark': '#128C7E',
        'whatsapp-green-light': '#DCF8C6',
        'whatsapp-teal': '#075E54',
        'whatsapp-blue': '#34B7F1',
        'whatsapp-gray-light': '#F0F0F0',
        'whatsapp-gray-dark': '#8696A0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
