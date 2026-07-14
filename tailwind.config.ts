import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17201b",
        moss: "#355e3b",
        fern: "#5c8a45",
        clay: "#b65f35",
        wheat: "#f4e7c8",
        paper: "#fbfaf6"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(23, 32, 27, 0.09)"
      }
    }
  },
  plugins: []
};

export default config;
