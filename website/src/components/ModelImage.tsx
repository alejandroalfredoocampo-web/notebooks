"use client";

import { useState } from "react";

/**
 * Imagen de producto con fallback a emoji si falta la URL o falla la carga.
 * (Se usa <img> plano: el optimizador de next/image no corre en Cloudflare Pages.)
 */
export default function ModelImage({
  src,
  alt,
  emoji,
  className = "",
  sizes,
}: {
  src?: string;
  alt: string;
  emoji: string;
  className?: string;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span className={`flex items-center justify-center ${className}`} aria-label={alt}>
        {emoji}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      sizes={sizes}
      onError={() => setFailed(true)}
      className={`object-contain ${className}`}
    />
  );
}
