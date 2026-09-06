/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: { extend: { colors: { background: '#f4f7f9', foreground: '#17232d', primary: '#cf5d18', muted: '#526270', border: '#c7d1d9' } } },
  plugins: [],
};
