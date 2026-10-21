/**
 * El adaptador de Medusa, sin red: lo que decide `mapearProducto` con los casos que se vieron
 * en la API real de Córdoba Notebooks el 21-oct-2026 (45 productos: 39 notebooks, 7 sin stock,
 * precios en la variante y una foto vieja en la metadata).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mapearProducto } from "../../../scrapers/adapters/medusa.mjs";

const ctx = { storeId: "cordobanotebooks", root: "https://cordobanotebooks.com.ar", categoryHandle: "notebooks", ahora: "2026-10-21T00:00:00.000Z" };

function producto(extra: Record<string, unknown> = {}, md: Record<string, unknown> = {}) {
  return {
    id: "prod_1",
    title: "Notebook Acer Aspire Go Ryzen 7 16GB 512GB SSD",
    handle: "notebook-acer-aspire-go-ryzen-7",
    status: "published",
    thumbnail: "https://cdn.example/x.jpg",
    variants: [{ id: "v1", calculated_price: { calculated_amount: 1399999 } }],
    categories: [{ handle: "notebooks" }, { handle: "acer" }],
    metadata: {
      marca: "Acer",
      precioEfectivo: 1299999,
      precioLista: 1849500,
      cuotas: [{ n: 3, monto: 616500 }, { n: 12, monto: 154125 }, { n: 6, monto: 308250 }],
      enStock: true,
      specs: [{ label: "Procesador", value: "AMD Ryzen 7" }, { label: "RAM", value: "16 GB" }],
      ...md,
    },
    ...extra,
  };
}

test("el precio de contado es el de la variante, no la foto de la metadata", () => {
  const l = mapearProducto(producto(), ctx)!;
  assert.equal(l.priceCash, 1399999);
  assert.equal(l.priceList, 1849500);
  assert.equal(l.url, "https://cordobanotebooks.com.ar/producto/notebook-acer-aspire-go-ryzen-7");
  assert.equal(l.id, "cordobanotebooks-prod_1");
  assert.equal(l.condition, "new");
  assert.equal(l.inStock, true);
});

test("sin precio en la región cae a metadata.precioEfectivo, y sin nada no se indexa", () => {
  const sinVariante = mapearProducto(producto({ variants: [] }), ctx)!;
  assert.equal(sinVariante.priceCash, 1299999);
  assert.equal(mapearProducto(producto({ variants: [] }, { precioEfectivo: null }), ctx), null);
});

test("la cuota que se guarda es la más larga", () => {
  const l = mapearProducto(producto(), ctx)!;
  assert.deepEqual(l.installments, { count: 12, amount: 154125 });
});

test("oculto, no publicado y de otra categoría quedan afuera", () => {
  assert.equal(mapearProducto(producto({}, { oculto: true }), ctx), null);
  assert.equal(mapearProducto(producto({ status: "draft" }), ctx), null);
  assert.equal(mapearProducto(producto({ categories: [{ handle: "ecoflow" }] }), ctx), null);
});

test("sin stock, outlet y usado se reflejan", () => {
  assert.equal(mapearProducto(producto({}, { enStock: false }), ctx)!.inStock, false);
  assert.equal(mapearProducto(producto({}, { condiciones: ["outlet"] }), ctx)!.condition, "outlet");
  assert.equal(mapearProducto(producto({}, { condiciones: ["usado"] }), ctx)!.condition, "refurb");
});

test("las specs llegan como mapa para el matching, con la marca", () => {
  const l = mapearProducto(producto(), ctx)!;
  assert.deepEqual(l.attrs, { marca: "Acer", procesador: "AMD Ryzen 7", ram: "16 GB" });
});

test("una lista menor o igual al contado no es lista", () => {
  assert.equal(mapearProducto(producto({}, { precioLista: 1000000 }), ctx)!.priceList, null);
});
