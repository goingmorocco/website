/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        royal: "#0F4C81",
        "royal-dark": "#0B3A63",
        ink: "#1F2937",
        sand: { light: "#EFE7DA" },
        paper: "#FBF8F3",
      },
    },
  },
  plugins: [],
};
