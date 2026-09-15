/**
 * La familia de procesador, en **un solo lugar**.
 *
 * Hasta el 15-sep había tres copias distintas:
 *
 *  - `scrapers/matching.mjs` producía ultra5/7/9, i3–i9, ryzen5/7/9 y apple-m;
 *  - `scrapers/bulk-review.mjs` además ryzen3 e intel-n;
 *  - `src/lib/adminData.ts` no tenía ultra5 ni ultra7, y mandaba "Core 5" a i5 pero no "Core 7"
 *    a i7.
 *
 * Y el filtro de `/notebooks` ofrecía una cuarta lista fija que no coincidía con ninguna:
 * "Intel Core Ultra" filtraba sólo `ultra9`, así que **un Core Ultra 7 o 5 no aparecía nunca con
 * ese filtro**; Ryzen 5 y Ryzen 9 no tenían opción; "Intel N" no lo producía el matching.
 *
 * Es la misma clase de error que Córdoba Notebooks corrigió dos veces en agosto y septiembre:
 * "arreglar el dato rompió el filtro" (f1560e84, nomenclatura nueva de Intel) y "el `?cat=` se
 * ignoraba desde siempre" (3d956294). Allá la salida fue que el filtro se derive del dato.
 *
 * Lo usan el matching, bulk-review, el prefill del admin y el filtro (vía `ETIQUETAS_CPU`).
 */

/** De un texto libre (título de publicación, nombre de CPU) a la familia, o `null`. */
export function familiaDeCpu(texto) {
  const t = String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  // Intel Core Ultra (Meteor Lake en adelante). Va primero: "Core Ultra 7" también dice "7".
  if (/ultra\s*9/.test(t)) return "ultra9";
  if (/ultra\s*7/.test(t)) return "ultra7";
  if (/ultra\s*5/.test(t)) return "ultra5";
  // Core clásico (i3–i9) y la nomenclatura nueva sin "i" ("Intel Core 7 150U").
  if (/\bi9\b|core\s*i?9\b/.test(t)) return "i9";
  if (/\bi7\b|core\s*i?7\b/.test(t)) return "i7";
  if (/\bi5\b|core\s*i?5\b/.test(t)) return "i5";
  if (/\bi3\b|core\s*i?3\b/.test(t)) return "i3";
  if (/ryzen\s*9/.test(t)) return "ryzen9";
  if (/ryzen\s*7/.test(t)) return "ryzen7";
  if (/ryzen\s*5/.test(t)) return "ryzen5";
  if (/ryzen\s*3/.test(t)) return "ryzen3";
  if (/\bm[1-4]\b|apple\s*m/.test(t)) return "apple-m";
  if (/celeron|pentium|\bn\d{3,4}\b/.test(t)) return "intel-n";
  return null;
}

/** Etiqueta para mostrar, en el orden en que se listan en el filtro. */
export const ETIQUETAS_CPU = {
  "intel-n": "Intel Celeron / N",
  i3: "Intel Core i3",
  i5: "Intel Core i5 / Core 5",
  i7: "Intel Core i7 / Core 7",
  i9: "Intel Core i9",
  ultra5: "Intel Core Ultra 5",
  ultra7: "Intel Core Ultra 7",
  ultra9: "Intel Core Ultra 9",
  ryzen3: "AMD Ryzen 3",
  ryzen5: "AMD Ryzen 5",
  ryzen7: "AMD Ryzen 7",
  ryzen9: "AMD Ryzen 9",
  "apple-m": "Apple M",
};
