import { ImageResponse } from "next/og";
import { NOMBRE_SITIO } from "@/lib/site";

/**
 * La imagen que se ve cuando alguien comparte un link del sitio por WhatsApp.
 *
 * ## Por qué existe
 *
 * Sin esto, un link compartido sale sin imagen o con lo primero que el scraper de WhatsApp
 * encuentre en la página — que en una ficha de producto es la foto de la notebook (bien) y
 * en la home es cualquier cosa (mal). En Argentina el canal por el que se comparte un
 * precio es WhatsApp, así que esta imagen es literalmente la portada del sitio para la
 * mayoría de las visitas que llegan por recomendación.
 *
 * Se genera en el build, no es un PNG en `public/`: así el nombre, los colores y el mensaje
 * salen de la misma fuente que el resto del sitio y no se desincronizan.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${NOMBRE_SITIO} — el comparador de precios de notebooks de Argentina`;

/** Los mismos tokens que `tailwind.config.ts`. Duplicados acá porque el runtime de
 *  `ImageResponse` no procesa Tailwind: son valores literales, no clases. */
const NAVY = "#131525";
const AZUL = "#336EFA";
const CYAN = "#6EC1E4";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 88px",
          background: NAVY,
          // El degradé sutil evita que 1200x630 de color plano se vea como un error de
          // carga en el preview de WhatsApp, que lo muestra chico y recortado.
          backgroundImage: `radial-gradient(circle at 85% 15%, rgba(51,110,250,0.35) 0%, rgba(19,21,37,0) 55%)`,
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 30,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: CYAN,
            fontWeight: 700,
          }}
        >
          Comparador de precios
        </div>

        <div style={{ display: "flex", marginTop: 26, fontSize: 82, fontWeight: 800, letterSpacing: -2 }}>
          notebooks
          <span style={{ color: AZUL }}>.com.ar</span>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 26,
            fontSize: 38,
            lineHeight: 1.3,
            color: "#cbd5e1",
            maxWidth: 900,
          }}
        >
          El precio real de cada notebook, en todas las tiendas de Argentina
        </div>

        <div style={{ display: "flex", marginTop: 44, gap: 20, fontSize: 26, color: "#94a3b8" }}>
          <span>Historial de precios</span>
          <span style={{ color: AZUL }}>·</span>
          <span>Ofertas verificadas</span>
          <span style={{ color: AZUL }}>·</span>
          <span>Gratis, sin registro</span>
        </div>
      </div>
    ),
    size,
  );
}
