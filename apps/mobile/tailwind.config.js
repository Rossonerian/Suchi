/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Keep NativeWind's semantic class names aligned with the shared Banani
        // palette used by the native surfaces and the web shell.
        background: '#0D0E13',
        foreground: '#F2F3F5',
        primary: '#6D8AFF',
        'primary-foreground': '#0D0E13',
        muted: '#9B9EAA',
        border: 'rgba(255,255,255,0.09)',
        surface: '#17181D',
        raised: '#1B1E27',
        success: '#42D47C',
        warning: '#E2B83E',
        danger: '#FF727A',
      },
    },
  },
  plugins: [],
};
