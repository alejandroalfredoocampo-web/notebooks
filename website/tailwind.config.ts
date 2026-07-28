import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#336EFA",   // azul primario (logo Córdoba Notebooks)
          deep: "#046BD2",   // azul profundo
          darker: "#0049A3", // azul hover
          navy: "#131525",   // navy de secciones/footer
          sky: "#B3CFFF",    // celeste claro
          cyan: "#6EC1E4",   // celeste acento
          green: "#28A745",  // éxito / stock / bajas de precio
        },
      },
      fontFamily: {
        sans: [
          "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Inter",
          "Roboto", "Helvetica Neue", "Arial", "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
