/**
 * El `Product` del JSON-LD: que no declare campos vacíos.
 *
 * `productoLd` sólo se verificaba contra un sitio andando (`probar-integracion.mjs`), o sea
 * con la base arriba. Estos casos son la parte que se puede probar sin base, que es justo la
 * que hacía falta para portar el arreglo de la marca de Córdoba Notebooks (28328f67) mientras
 * la base no responde.
 *
 * La regla, que es la del archivo entero: **un campo que no se tiene se omite, no se emite
 * vacío.** Para Google un `name` vacío dentro de `brand` no es un dato que falta, es un dato
 * nulo declarado — y es lo que Search Console les levantó el 12-sep-2026.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { productoLd } from "../schema.ts";
import type { ModelWithOffers, Listing, Store } from "../types.ts";

const tienda = {
  id: "t1",
  name: "Tienda Uno",
  slug: "tienda-uno",
  url: "https://tienda-uno.com.ar",
  type: "retail",
  physicalStore: false,
  city: "Córdoba",
  affiliate: null,
} as Store;

/** Una publicación vista hoy, para que la oferta esté vigente. */
function publicacion(): Listing & { store: Store } {
  return {
    id: "t1-1",
    storeId: "t1",
    modelId: "m1",
    url: "https://tienda-uno.com.ar/p/1",
    titleRaw: "Notebook HP Victus 15",
    priceList: 1_499_999,
    priceCash: 1_299_999,
    installments: null,
    inStock: true,
    condition: "new",
    lastSeenAt: new Date().toISOString(),
    store: tienda,
  };
}

function modelo(extra: Partial<ModelWithOffers> = {}): ModelWithOffers {
  const l = publicacion();
  return {
    id: "m1",
    brand: "HP",
    brandSlug: "hp",
    name: "Victus 15",
    slug: "victus-15",
    partNumber: "",
    cpu: "Core i5-13420H",
    cpuFamily: "i5",
    ramGb: 16,
    ramType: "DDR4",
    storageGb: 512,
    storageType: "SSD",
    screenSizeIn: 15.6,
    screenResolution: "1920x1080",
    screenPanel: "IPS",
    screenRefreshHz: 144,
    gpu: "RTX 2050",
    gpuType: "dedicada",
    os: "Windows 11",
    weightKg: 2.3,
    batteryWh: 52,
    releaseYear: 2024,
    useCases: ["gaming"],
    listings: [l],
    bestPrice: l.priceCash,
    bestListing: l,
    avg90: null,
    minHistoric: null,
    dropPct: 0,
    isRealDeal: false,
    bestInstallment: null,
    maxInstallments: 0,
    hasInterestFree: false,
    ...extra,
  } as ModelWithOffers;
}

test("con marca cargada, el Product declara brand", () => {
  const ld = productoLd(modelo()) as Record<string, unknown>;
  assert.deepEqual(ld.brand, { "@type": "Brand", name: "HP" });
});

test("sin marca, brand NO se emite vacío (28328f67 de Córdoba Notebooks)", () => {
  const ld = productoLd(modelo({ brand: "" })) as Record<string, unknown>;
  assert.ok(!("brand" in ld), "emitió brand con el name vacío");
  // Y el resto del nodo sigue en pie: omitir un campo no puede costar la ficha entera.
  assert.equal(ld["@type"], "Product");
  assert.ok(Array.isArray(ld.offers));
});

test("ningún campo del Product se emite con valor vacío", () => {
  // La regla del archivo, aplicada a todo el nodo y no sólo a la marca: es la forma de que
  // esto siga valiendo cuando alguien agregue el próximo campo.
  for (const m of [modelo(), modelo({ brand: "" }), modelo({ partNumber: "", imageUrl: "" })]) {
    const ld = productoLd(m) as Record<string, unknown>;
    for (const [k, v] of Object.entries(ld)) {
      assert.notEqual(v, "", `${k} salió como string vacío`);
      assert.notEqual(v, null, `${k} salió nulo`);
      if (v && typeof v === "object" && "name" in (v as Record<string, unknown>)) {
        assert.notEqual((v as Record<string, unknown>).name, "", `${k}.name salió vacío`);
      }
    }
  }
});

test("sin ninguna oferta vigente no hay Product", () => {
  // Google exige `offers`; un Product sin ofertas es un error repetido en cada ficha.
  const viejo = publicacion();
  viejo.lastSeenAt = new Date(Date.now() - 30 * 86400_000).toISOString();
  assert.equal(productoLd(modelo({ listings: [viejo] })), null);
});
