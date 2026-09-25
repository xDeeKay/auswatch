import type { Config } from "tailwindcss";

// Tailwind accepts a function here for opacity-aware CSS-variable colors at
// runtime, even though its own Config type only declares plain strings.
function withOpacity(rgbVariable: string): string {
  return ((({ opacityValue }: { opacityValue?: string }) =>
    opacityValue === undefined
      ? `rgb(var(${rgbVariable}))`
      : `rgb(var(${rgbVariable}) / ${opacityValue})`) as unknown) as string;
}

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: withOpacity("--color-ink-rgb"),
        parchment: withOpacity("--color-parchment-rgb"),
        amber: withOpacity("--color-accent-rgb"),
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
        label: ["var(--font-body)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
