import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'hsl(var(--ink))',
        canvas: 'hsl(var(--canvas))',
        panel: 'hsl(var(--panel))',
        line: 'hsl(var(--line))',
        brand: 'hsl(var(--brand))',
      },
      borderRadius: { xl: '1rem', '2xl': '1.25rem' },
      boxShadow: { soft: '0 18px 50px hsl(var(--shadow) / .08)' },
    },
  },
  plugins: [],
} satisfies Config
