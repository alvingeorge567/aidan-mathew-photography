import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0C0C0A",          // near-black
        ivory: "#F3EFE8",        // warm ivory
        champagne: "#D2B497",    // champagne beige (accent on dark)
        body: "#292722",         // dark body text
        muted: "#A18B73",        // muted accent (decorative / on dark only)
        bronze: "#7A6550",       // accessible accent text on ivory (4.8:1)
        stone: "#E6E0D6",        // hairlines on ivory
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', "Garamond", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      letterSpacing: { label: "0.22em" },
      maxWidth: { prose: "38rem" },
    },
  },
  plugins: [],
};
export default config;
