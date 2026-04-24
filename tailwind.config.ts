import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        aura: {
          bg: "#0b1326",
          surface: "#131b2e",
          "surface-2": "#171f33",
          "surface-3": "#222a3d",
          "surface-4": "#2d3449",
          primary: "#ff5168",
          "primary-soft": "#ffb3b6",
          secondary: "#6f00be",
          "secondary-soft": "#ddb7ff",
          tertiary: "#ff4a8d",
          "tertiary-soft": "#ffb1c5",
          text: "#dae2fd",
          "text-dim": "#e5bdbe",
          "text-muted": "#ac8889",
        },
      },
      fontFamily: {
        display: ["Epilogue", "system-ui", "sans-serif"],
        body: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        caps: ["'Space Grotesk'", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
      },
      boxShadow: {
        aura: "0 0 40px rgba(255, 81, 104, 0.25)",
        "aura-lg": "0 0 60px rgba(255, 81, 104, 0.4)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14px)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "pulse-glow": "pulseGlow 2.5s ease-in-out infinite",
        "fade-in": "fadeIn 500ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
