/**
 * Inserta un bloque de datos estructurados.
 *
 * El `replace` de `<` no es decorativo: si el nombre de un modelo o de una tienda
 * contuviera `</script>`, el navegador cerraría el bloque ahí y el resto del JSON se
 * ejecutaría como HTML. Escapar el `<` como `<` mantiene el JSON válido y cierra esa
 * puerta. En este sitio los nombres vienen de **scrapers sobre HTML ajeno**, así que el
 * riesgo no es hipotético: el título de una publicación lo escribe otra empresa.
 *
 * Es la razón por la que esto es un componente y no un `<script>` suelto repetido en cada
 * página — que es como estaba en las tres páginas que ya emitían JSON-LD.
 */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
