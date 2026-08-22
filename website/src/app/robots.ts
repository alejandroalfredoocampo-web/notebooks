import type { MetadataRoute } from "next";
import { urlAbsoluta } from "@/lib/site";

/**
 * `robots.txt`.
 *
 * ## Lo que faltaba
 *
 * La versión anterior sólo bloqueaba `/salir/`. Quedaban abiertos al crawleo el admin
 * entero, la API, la cuenta del usuario, los favoritos y el portal de tiendas. Nada de eso
 * es indexable de todos modos (requiere sesión), pero el crawleo cuesta igual: cada URL que
 * Googlebot pide y descarta es presupuesto de rastreo que no se gastó en una ficha de
 * producto. En un sitio con miles de fichas, eso sí se nota.
 *
 * ## Robots no desindexa
 *
 * Un `Disallow` frena el **crawleo**, no la indexación: una URL bloqueada que ya está en el
 * índice se queda ahí, y encima Google no puede leer el `noindex` que la sacaría. Por eso
 * las páginas privadas también emiten `robots: noindex` por metadata (ver `metaPrivada` en
 * `lib/seo.ts`). Hacen falta los dos.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api/",
          // El redirect saliente. No es contenido y multiplica por N las URLs del sitio
          // (una por publicación). También emite `X-Robots-Tag` por las dudas.
          "/salir/",
          // Requieren sesión: lo que devuelven a un crawler es la pantalla de login.
          "/cuenta",
          "/favoritos",
          "/portal",
          "/ingresar",
          // Se llega por link de un mail, nunca por búsqueda.
          "/baja",
          /**
           * Las combinaciones de filtros.
           *
           * `/notebooks?marca=x&ram=16&orden=precio` genera una página distinta por cada
           * combinación: son miles, todas con el mismo contenido reordenado. Es la trampa
           * clásica de facetas — el crawler se pierde ahí adentro y no llega a las fichas.
           * El listado sin parámetros sí se indexa, y las páginas de marca y de uso son las
           * versiones canónicas de los cortes que sí valen la pena.
           */
          "/notebooks?",
          "/ofertas?",
          "/marcas/*?",
        ],
      },
      /**
       * Los crawlers de modelos de lenguaje, permitidos explícitamente.
       *
       * Es una decisión de negocio y conviene que esté escrita: este sitio **quiere** que
       * un asistente conteste "el mejor precio del X es $Y en la tienda Z" citándolo. Un
       * comparador no vende contenido, vende el click, y aparecer en la respuesta de un
       * modelo es hoy una de las pocas formas nuevas de conseguirlo. La contracara —que el
       * modelo conteste sin mandar a nadie— existe, y es la razón por la que además hay un
       * `/llms.txt` que le da los datos correctos en vez de dejar que los deduzca.
       */
      {
        userAgent: ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "PerplexityBot", "Google-Extended"],
        allow: "/",
        disallow: ["/admin", "/api/", "/salir/", "/cuenta", "/favoritos", "/portal"],
      },
    ],
    sitemap: urlAbsoluta("/sitemap.xml"),
    host: urlAbsoluta("/").replace(/\/$/, ""),
  };
}
