import type { Config } from "tailwindcss";

/** Helper so tokens defined as "R G B" support the `/opacity` modifier. */
const withOpacity = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: withOpacity("--background"),
        card: withOpacity("--card"),
        "card-border": withOpacity("--card-border"),
        "text-primary": withOpacity("--text-primary"),
        "text-muted": withOpacity("--text-muted"),
        accent: withOpacity("--accent"),
        button: withOpacity("--button"),
        "button-foreground": withOpacity("--button-foreground"),
        success: withOpacity("--success"),
        warning: withOpacity("--warning"),
        danger: withOpacity("--danger"),
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        card: "0 1px 2px rgb(17 17 17 / 0.04), 0 8px 24px rgb(17 17 17 / 0.06)",
      },
      keyframes: {
        "flip-in": {
          "0%": { transform: "rotateX(90deg)", opacity: "0" },
          "100%": { transform: "rotateX(0deg)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "flip-in": "flip-in 0.35s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
