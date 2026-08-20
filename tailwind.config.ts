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
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "#dc2626",
          foreground: "#ffffff",
        },
      },
      animation: {
        marquee: "marquee var(--duration, 40s) infinite linear",
        "marquee-vertical": "marquee-vertical var(--duration, 40s) linear infinite",
        shine: "shine var(--duration, 14s) infinite linear",
        "shimmer-slide": "shimmer-slide var(--speed, 3s) ease-in-out infinite alternate",
        "spin-around": "spin-around calc(var(--speed, 3s) * 2) infinite linear",
        "shiny-text": "shiny-text 8s infinite",
        "pulse-ring-btn": "pulse-ring-btn var(--duration, 1.5s) ease-out infinite",
        "pulse-ripple": "pulse-ripple var(--duration, 1.5s) cubic-bezier(0.16, 1, 0.3, 1) infinite",
      },
      keyframes: {
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(calc(-100% - var(--gap)))" },
        },
        "marquee-vertical": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(calc(-100% - var(--gap)))" },
        },
        shine: {
          "0%": { backgroundPosition: "0% 0%" },
          "50%": { backgroundPosition: "100% 100%" },
          to: { backgroundPosition: "0% 0%" },
        },
        "shimmer-slide": {
          to: { transform: "translate(calc(100cqw - 100%), 0)" },
        },
        "spin-around": {
          "0%": { transform: "translateZ(0) rotate(0)" },
          "15%, 35%": { transform: "translateZ(0) rotate(90deg)" },
          "65%, 85%": { transform: "translateZ(0) rotate(270deg)" },
          "100%": { transform: "translateZ(0) rotate(360deg)" },
        },
        "shiny-text": {
          "0%, 90%, 100%": {
            backgroundPosition: "calc(-100% - var(--shiny-width)) 0",
          },
          "30%, 60%": {
            backgroundPosition: "calc(100% + var(--shiny-width)) 0",
          },
        },
        "pulse-ring-btn": {
          "0%, 100%": { boxShadow: "0 0 0 0 var(--pulse-color, rgba(220, 38, 38, 0.5))" },
          "50%": { boxShadow: "0 0 0 var(--distance, 8px) var(--pulse-color, rgba(220, 38, 38, 0))" },
        },
        "pulse-ripple": {
          "0%": { boxShadow: "0 0 0 0 var(--pulse-color, rgba(220, 38, 38, 0.7))" },
          "100%": { boxShadow: "0 0 0 var(--distance, 8px) transparent" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
