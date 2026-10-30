import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    fontSize: {
      xs: ["var(--font-size-label)", { lineHeight: "1rem" }],
      sm: ["var(--font-size-body)", { lineHeight: "1rem" }],
      base: ["var(--font-size-body)", { lineHeight: "1rem" }],
      lg: ["var(--font-size-heading)", { lineHeight: "1.25rem" }],
      xl: ["var(--font-size-heading)", { lineHeight: "1.25rem" }],
      "2xl": ["var(--font-size-heading)", { lineHeight: "1.25rem" }],
      "3xl": ["var(--font-size-heading)", { lineHeight: "1.25rem" }],
      "4xl": ["var(--font-size-heading)", { lineHeight: "1.25rem" }],
      "5xl": ["var(--font-size-heading)", { lineHeight: "1.25rem" }],
      "6xl": ["var(--font-size-heading)", { lineHeight: "1.25rem" }]
    },
    extend: {
      colors: {
        slateblue: {
          50: "#ecfeff",
          100: "#cffafe",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490"
        }
      },
      boxShadow: {
        panel: "0 14px 40px rgba(15, 23, 42, 0.08)"
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};

export default config;
