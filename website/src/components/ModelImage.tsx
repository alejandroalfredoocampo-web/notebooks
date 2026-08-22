"use client";

import { useState } from "react";

/**
 * Imagen de producto, con reserva de espacio y respaldo a emoji.
 *
 * ## Por qué es un `<img>` y no `next/image`
 *
 * Está explicado largo en `next.config.mjs`: las imágenes son de terceros y el conjunto de
 * hosts es abierto, así que habilitar el optimizador exigiría el comodín `**`, que deja el
 * endpoint de imágenes como proxy abierto y ata la factura a cuántas tiendas se indexen.
 *
 * ## Lo que sí se arregló
 *
 * 1. **Dimensiones declaradas.** Sin `width`/`height`, el navegador no sabe cuánto espacio
 *    reservar y el contenido salta cuando la imagen carga. En una grilla de veinte tarjetas
 *    eso es veinte saltos, y es la mitad del CLS de la página.
 * 2. **La imagen de la ficha ya no es `lazy`.** Es la imagen más grande sobre el pliegue —
 *    o sea, la que define el LCP— y estaba diferida, que es pedirle al navegador que la
 *    baje **después** de haber terminado todo lo demás. Ahora la ficha pasa `prioridad` y
 *    esa imagen sale con `fetchPriority="high"`; el resto sigue diferido.
 * 3. **`decoding="async"`**, para que decodificar una imagen grande no bloquee el pintado.
 * 4. **`referrerPolicy`.** El `Referer` hacia el host de la tienda lleva sólo el origen, no
 *    la URL de la ficha.
 */
export default function ModelImage({
  src,
  alt,
  emoji,
  className = "",
  sizes,
  ancho = 400,
  alto = 300,
  prioridad = false,
}: {
  src?: string;
  alt: string;
  emoji: string;
  className?: string;
  sizes?: string;
  /** Dimensiones intrínsecas aproximadas: sólo definen la proporción que se reserva. */
  ancho?: number;
  alto?: number;
  /** `true` en la imagen que domina la primera pantalla (la de la ficha). */
  prioridad?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        className={`flex items-center justify-center ${className}`}
        role="img"
        aria-label={alt}
      >
        {emoji}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={ancho}
      height={alto}
      sizes={sizes}
      loading={prioridad ? "eager" : "lazy"}
      fetchPriority={prioridad ? "high" : "auto"}
      decoding="async"
      referrerPolicy="strict-origin-when-cross-origin"
      onError={() => setFailed(true)}
      className={`object-contain ${className}`}
    />
  );
}
