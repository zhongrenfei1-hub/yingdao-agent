/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // iris 紫主色板 — 影刀主线
        iris: {
          50: '#faf5ff',
          100: '#f3eaff',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        // warm 色板(保留 · 影刀已有组件兼容用)
        terracotta: '#C0755A',
        'near-black': '#1A1A1A',
        'olive-gray': '#6B6B5E',
        'stone-gray': '#9B9B8F',
        'warm-sand': '#E8DCCA',
        ivory: '#FAF7F2',
        parchment: '#F5F0E8',
        'sage-green': '#7A9E7E',
        'amber-warm': '#D4A843',
        'border-cream': '#E5DDD0',
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['"Inter"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
        sharp: '-0.025em',
      },
      // 圆角阶梯(0.625rem 基准,shadcn 标准)
      borderRadius: {
        DEFAULT: '0.625rem',
        sm: 'calc(0.625rem - 4px)',
        md: 'calc(0.625rem - 2px)',
        lg: '0.625rem',
        xl: 'calc(0.625rem + 4px)',
        '2xl': 'calc(0.625rem + 8px)',
        '3xl': 'calc(0.625rem + 12px)',
      },
    },
  },
  plugins: [],
};
