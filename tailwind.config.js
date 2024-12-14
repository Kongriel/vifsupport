/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/pages/**/*.{js,ts,jsx,tsx,mdx}", "./src/components/**/*.{js,ts,jsx,tsx,mdx}", "./src/app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        bebas: ['"Bebas Neue"', "sans-serif"],
        montserrat: ['"Montserrat"', "sans-serif"],
      },
      colors: {
        "knap-10": "rgba(54, 69, 77, 0.1)",
        "bono-10": "#36454D",
        "bono-50": "#384455",
        hovercolor: "#ff0000",
        "taupe-10": "#BBD4E0",
      },
      fontSize: {
        customClamp: "clamp(2rem, 1.4643rem + 2.1429vw, 3.875rem);",
        customClampMedium: "clamp(1.5rem, 1.0192rem + 1.5385vw, 2.75rem);",
      },
    },
  },
  plugins: [],
};
