# Propuesta de producto — Notebooks.com.ar

## Posicionamiento

**"El comparador de notebooks de Argentina."** Especialista, no generalista. La ventaja sobre HardGamers no es hacer lo mismo con otro nombre: es hacer *mejor* la categoría notebooks, con datos normalizados que un comparador de componentes no tiene.

Diferenciadores:

1. **Ficha única por modelo**: un "Lenovo IdeaPad 3 15ALC6 8GB/256GB" es UNA ficha con N ofertas de N tiendas, no N publicaciones sueltas. Esto habilita comparación real, historial de precios por modelo y SEO fuerte (una URL canónica por modelo).
2. **Specs normalizadas y filtrables**: procesador (con benchmark), RAM, almacenamiento, pantalla (tamaño/resolución/panel), GPU, peso, batería. Filtros que Mercado Libre no ofrece bien.
3. **Precio "real"**: precio de lista vs. precio con descuento, precio en cuotas vs. contado, detección de ofertas infladas vía historial.
4. **Recomendador por uso**: "¿para qué la querés?" (estudiar / oficina / diseño / gaming / programar) + presupuesto → ranking de mejores opciones. Nadie lo hace bien localmente.

## Secciones del sitio

| Sección | Descripción |
|---|---|
| **Home** | Buscador prominente, ofertas destacadas del día (bajadas reales de precio), accesos por uso ("gamer", "estudiantes", "trabajo") y por marca, últimos modelos indexados. |
| **Listado / búsqueda** | Grilla de modelos con filtros por specs, marca, precio, tienda, disponibilidad. Orden por precio, relevancia, % de baja. |
| **Ficha de producto** | Specs completas, tabla de ofertas por tienda (precio contado/cuotas, stock, link saliente), gráfico de historial de precios, botón de alerta de precio, modelos similares. |
| **Ofertas / Bajaron de precio** | Solo bajadas verificadas contra historial. Es la sección que genera visitas recurrentes y newsletter. |
| **Comparador lado a lado** | Hasta 3–4 modelos en columnas comparando specs y mejor precio de cada uno. |
| **Guías y rankings** | "Mejores notebooks por menos de $1.500.000", "Mejor notebook para estudiantes 2026". Contenido SEO actualizado con datos vivos del índice. |
| **Tiendas** | Página por tienda indexada con su catálogo y datos de confianza (web, local físico, medios de pago). |
| **Alertas / Mi cuenta** | Favoritos y alertas de precio por email. Registro simple (Google). |
| **Portal para tiendas** (fase 2) | Dashboard con clics recibidos, posición vs. competencia, gestión de feed. Base de la monetización B2B. |

## Funcionalidades core (por orden de construcción)

1. **Scrapers/ingesta de feeds** de las tiendas objetivo (empezar con 10–15: Full H4rd, Maximus, Gezatek, Venex, Mexx, Compumundo, Cetrogar, Frávega, Musimundo, Mercado Libre tiendas oficiales, etc.). Actualización mínimo diaria; ideal cada 4–6 hs.
2. **Matching de productos**: motor que agrupa publicaciones de distintas tiendas bajo el mismo modelo canónico (por part number, EAN o título parseado + specs). Es el corazón técnico del producto y la barrera de entrada.
3. **Catálogo canónico de modelos** con specs normalizadas (carga semiautomática + curaduría manual).
4. **Historial de precios** por oferta y por modelo (mínimo histórico, precio actual, % vs. promedio 90 días).
5. **Búsqueda y filtros** rápidos (índice tipo Meilisearch/Typesense).
6. **Alertas de precio** por email.
7. **Tracking de clics salientes** (para métricas propias y para el futuro modelo comercial).

## Qué NO hacer (al menos al inicio)

- No vender directo ni intermediar pagos (evita logística, garantías y disputas).
- No abrir 20 categorías: primero dominar notebooks; luego expandir a periféricos/monitores como categorías adyacentes.
- No exigir registro para navegar, comparar ni ver historial.

## Métricas norte

- Modelos indexados con ≥3 ofertas (densidad de comparación).
- Visitas orgánicas/mes y % de recurrencia.
- Clics salientes a tiendas (el "inventario" que después se monetiza).
- Suscriptos a alertas (retención propia, independiente de Google).
