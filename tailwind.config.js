/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:       '#080a10',
        surface:  '#12141a',
        surface2: '#1a1d26',
        border:   '#252836',
        accent:   '#00e5ff',
        accent2:  '#ff6b35',
        accent3:  '#7c3aed',
        success:  '#00ff9d',
        danger:   '#ff4757',
        warning:  '#ffd32a',
        muted:    '#5a5f72',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
