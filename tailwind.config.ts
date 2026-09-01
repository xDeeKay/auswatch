import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#12181D",
        parchment: "#E9E4D8",
        amber: "#D9A441",
        status: {
          active: "#C1443D",
          removed: "#5B8266",
          unconfirmed: "#6E7B86",
        },
        error: "#C1443D",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
