import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f4ff",
          100: "#dce8ff",
          500: "#3b7bff",
          600: "#2563eb",
          700: "#1d4ed8",
          900: "#0f172a",
        },
        cyber: {
          bg: "#050b18",
          card: "#0d1b2e",
          border: "#1a3050",
          accent: "#00d4ff",
          glow: "#0066ff",
          text: "#94b8d0",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 10px #00d4ff33" },
          "50%": { boxShadow: "0 0 30px #00d4ff99, 0 0 60px #00d4ff33" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
      },
      backgroundImage: {
        "cyber-grid":
          "linear-gradient(rgba(0,212,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.04) 1px, transparent 1px)",
        "hero-radial":
          "radial-gradient(ellipse at 50% 0%, rgba(0,102,255,0.15) 0%, transparent 60%)",
      },
      backgroundSize: {
        "cyber-grid": "40px 40px",
      },
    },
  },
  plugins: [],
} satisfies Config;
