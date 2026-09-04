import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "media",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-bebas)", "sans-serif"],
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
      },
      colors: {
        sps: {
          violet900: "#33124F",
          violet700: "#5B21B6",
          violet600: "#6D28D9",
          violet500: "#7C3AED",
          violet400: "#A78BFA",
          violet100: "#EFE8FC",
          green: "#1F9D63",
          red: "#DC3D3D",
        },
      },
      boxShadow: {
        card: "0 10px 28px -12px rgba(59,22,103,.22)",
        cardSm: "0 2px 8px -2px rgba(59,22,103,.14)",
      },
    },
  },
  plugins: [],
};

export default config;
