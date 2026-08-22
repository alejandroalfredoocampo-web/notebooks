/**
 * Configuración de Next del comparador.
 *
 * La parte larga de este archivo son las cabeceras de seguridad. Hasta ahora el sitio no
 * mandaba **ninguna**, y en un indexador eso tiene consecuencias distintas —pero no
 * menores— que en una tienda:
 *
 *  - **El sitio era enmarcable.** Sin `frame-ancestors`, cualquiera lo pone en un iframe
 *    y hace clickjacking sobre los botones "Ir a la tienda". Acá el click saliente **es**
 *    el producto: es lo que se factura a la tienda y lo que sostiene el modelo. Un tercero
 *    que enmarca el sitio y genera clicks está falsificando el inventario que se vende.
 *  - **El token de baja de alertas viajaba en el `Referer`.** El link del mail es
 *    `/baja?id=…&t=<hmac>`, y sin `Referrer-Policy` cualquier recurso de terceros que
 *    cargue esa página se lleva el token entero.
 *  - **Sin CSP, un script comprometido reescribe los precios.** La credibilidad de un
 *    comparador es que el número que muestra es el que cobra la tienda; un script inyectado
 *    que cambia el orden del ranking es indetectable desde afuera.
 */

/* ---------------------------------------------------------------------------
 * Orígenes de terceros que el sitio carga de verdad.
 *
 * La lección del otro proyecto: **leer el código propio no alcanza para armar esta
 * lista**. Los orígenes que faltaban no aparecían en ningún import — uno estaba adentro de
 * un SDK que decide en runtime de dónde baja sus assets, otro en un `<iframe src>` del HTML
 * renderizado. Y ojo con el comodín: `*.host` **no matchea el apex** ni matchea otro TLD.
 * ------------------------------------------------------------------------- */

/** Supabase: auth del usuario y lecturas desde el navegador. */
const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
/** El proyecto de Supabase con comodín, para no romper si cambia el ref del proyecto. */
const SUPABASE_WILDCARD = "https://*.supabase.co wss://*.supabase.co";

/**
 * `img-src` es la excepción deliberada de esta CSP: `https:` abierto.
 *
 * Las imágenes de producto **son de las tiendas indexadas** y salen de los scrapers, así
 * que el conjunto de hosts es abierto por diseño y crece cada vez que se suma una tienda.
 * Una lista blanca acá se rompería en silencio: la imagen desaparece de la ficha y nadie
 * mira los logs de CSP. El riesgo que se acepta a cambio es acotado —una imagen no ejecuta
 * código— y el vector real que quedaría (medir al visitante desde un host ajeno) ya está
 * presente por el simple hecho de hotlinkear.
 */
const IMAGENES = "https: data: blob:";

const CSP = [
  `default-src 'self'`,
  `base-uri 'self'`,
  `object-src 'none'`,
  // Un comparador no se embebe en ningún lado. `frame-ancestors` no lo cubre
  // `X-Frame-Options` para navegadores viejos, por eso van los dos.
  `frame-ancestors 'none'`,
  `form-action 'self'`,
  // `unsafe-inline` es lo que necesita Next para hidratar (los chunks inline con el
  // payload de RSC). `unsafe-eval` NO está: nada en este sitio lo usa, y sacarlo es la
  // mitad del valor de una CSP.
  `script-src 'self' 'unsafe-inline'`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' ${IMAGENES}`,
  `font-src 'self' data:`,
  `connect-src 'self' ${SUPABASE} ${SUPABASE_WILDCARD}`,
  `frame-src 'none'`,
  `media-src 'self'`,
  `worker-src 'self' blob:`,
  `manifest-src 'self'`,
  // Sin esto, un `http://` colado en una imagen scrapeada rompe el candado en el navegador
  // del visitante. Con esto el navegador lo reescribe a https y sigue.
  `upgrade-insecure-requests`,
  `report-uri /api/csp-report`,
]
  .filter(Boolean)
  .join("; ");

/**
 * La CSP arranca en **report-only** y pasa a enforce con `CSP_ENFORCE=true`.
 *
 * Y el flag existe porque en el otro proyecto se dio por hecho que prenderlo era gratis, y
 * no lo era: faltaban cuatro orígenes que sólo aparecían mirando lo que el sitio pide de
 * verdad. El procedimiento es: desplegar en report-only, mirar `/api/csp-report` unos
 * días, y recién ahí prender el flag.
 */
const cspEnforce = process.env.CSP_ENFORCE === "true";

const headersDeSeguridad = [
  {
    key: cspEnforce ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only",
    value: CSP,
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Con `strict-origin-when-cross-origin` el `Referer` hacia un tercero lleva sólo el
  // origen. Eso hace dos cosas: el token de baja de alertas deja de viajar, y las tiendas
  // siguen viendo que el visitante vino de notebooks.com.ar — que es información que
  // queremos que tengan, porque es la prueba del tráfico que se les manda.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), usb=(), payment=(), interest-cohort=()",
  },
  // Dos años y con preload: el valor que pide la lista de HSTS. Ojo que es difícil de
  // revertir — una vez que un navegador lo vio, no vuelve a hablar HTTP con este dominio
  // hasta que venza.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Aísla el sitio de ventanas abiertas por él y viceversa (Spectre y `window.opener`).
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // El header "hecho con Next" no aporta nada y le dice a cualquiera qué stack atacar.
  poweredByHeader: false,

  images: {
    /**
     * Las imágenes son de terceros y el conjunto de hosts es abierto (ver `IMAGENES`).
     * `remotePatterns` con `hostname: "**"` es lo que permite usar `next/image` sin tener
     * que dar de alta un host cada vez que se suma una tienda.
     *
     * `dangerouslyAllowSVG` queda en **false** (el default) a propósito: un SVG servido
     * desde el host de otra empresa puede traer script, y el optimizador lo pasaría tal
     * cual. Las tiendas publican JPG y WebP; el día que una publique SVG, esa imagen no se
     * muestra y está bien que así sea.
     */
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
    // Los tamaños que el sitio pide de verdad: la tarjeta de la grilla y la ficha.
    imageSizes: [96, 128, 200, 256, 384],
    deviceSizes: [640, 750, 828, 1080, 1200],
    formats: ["image/webp"],
    // Una imagen de producto cambia cuando la tienda la cambia, no en cada request.
    minimumCacheTTL: 60 * 60 * 24,
  },

  async headers() {
    return [
      { source: "/:path*", headers: headersDeSeguridad },
      /**
       * El redirect saliente no se cachea nunca.
       *
       * Es lo que registra el click que se le factura a la tienda: una respuesta cacheada
       * por un CDN intermedio es un click que ocurre y no se cuenta. Y `X-Robots-Tag` acá
       * es cinturón sobre el `Disallow` del robots: un crawler que igual lo siga no indexa
       * una URL de redirección con nuestro dominio.
       */
      {
        source: "/salir/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
