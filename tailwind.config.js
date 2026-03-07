/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Map your existing CSS variables for use with Tailwind
        primary: 'var(--primary)',
        'primary-hover': 'var(--primary-hover)',
        muted: 'var(--muted)',
        surface: 'var(--surface)',
        border: 'var(--border)',
        error: 'var(--error)',
        success: 'var(--success)',
      },
    },
  },
  plugins: [],
};
