import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#6366F1",
        "primary-hover": "#4F46E5",
        "primary-light": "#EEF2FF",
        background: "#FAFAF8",
        "bg-secondary": "#F5F4F0",
        surface: "#FFFFFF",
        "text-primary": "#0F172A",
        "text-secondary": "#64748B",
        accent: "#10B981",
      },
      borderRadius: {
        card: "12px",
        input: "8px",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
