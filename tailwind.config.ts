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
        ivory: "var(--color-ivory)",
        charcoal: "var(--color-charcoal)",
        stone: "var(--color-stone)",
        bronze: "var(--color-bronze)",
        fog: "var(--color-fog)",
        ink: "var(--color-ink)",
        line: "var(--color-line)",
        paper: "var(--color-paper)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        info: "var(--color-info)",
      },
      fontFamily: {
        display: "var(--font-display)",
        body: "var(--font-body)",
        mono: "var(--font-mono)",
      },
      fontSize: {
        "display-2xl": ["clamp(3rem, 8vw, 6.5rem)", { lineHeight: "0.95", letterSpacing: "-0.02em", fontWeight: "400" }],
        "display-xl": ["clamp(2.5rem, 6vw, 4.75rem)", { lineHeight: "1", letterSpacing: "-0.015em", fontWeight: "400" }],
        "display-lg": ["clamp(2rem, 4.5vw, 3.5rem)", { lineHeight: "1.05", letterSpacing: "-0.01em", fontWeight: "400" }],
        "display-md": ["clamp(1.5rem, 3vw, 2.25rem)", { lineHeight: "1.15", letterSpacing: "-0.01em", fontWeight: "400" }],
        "title-lg": ["1.5rem", { lineHeight: "1.3", letterSpacing: "-0.01em" }],
        "title-md": ["1.25rem", { lineHeight: "1.4", letterSpacing: "-0.005em" }],
        "title-sm": ["1.0625rem", { lineHeight: "1.5" }],
        "body-lg": ["1.125rem", { lineHeight: "1.75" }],
        "body-md": ["1rem", { lineHeight: "1.7" }],
        "body-sm": ["0.875rem", { lineHeight: "1.6" }],
        caption: ["0.75rem", { lineHeight: "1.5", letterSpacing: "0.06em" }],
        overline: ["0.6875rem", { lineHeight: "1.4", letterSpacing: "0.14em" }],
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
      },
      borderRadius: {
        sm: "0.375rem",
        DEFAULT: "0.5rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.5rem",
        "2xl": "2rem",
        full: "9999px",
      },
      boxShadow: {
        card: "0 1px 2px rgb(20 20 19 / 0.05), 0 8px 24px -12px rgb(20 20 19 / 0.12)",
        raised: "0 2px 4px rgb(20 20 19 / 0.06), 0 16px 40px -16px rgb(20 20 19 / 0.2)",
        overlay: "0 8px 40px -8px rgb(20 20 19 / 0.28)",
        focus: "0 0 0 3px rgb(168 140 105 / 0.35)",
      },
      maxWidth: {
        container: "80rem",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out both",
        "fade-up": "fade-up 0.5s ease-out both",
        "scale-in": "scale-in 0.25s ease-out both",
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
