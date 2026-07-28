# Verticales de negocio y puntos débiles — Notebooks.com.ar

Análisis de las opciones de monetización, con debilidades explícitas de cada una y una recomendación de secuencia.

## Opción A — Indexador pago: cobrar a las tiendas por publicar (listing fee / suscripción)

**Cómo funciona**: la tienda paga un fijo mensual (o por cantidad de SKUs) para aparecer en el índice.

**Fortalezas**: ingreso predecible y recurrente; simple de administrar; no requiere tracking de conversiones.

**Puntos débiles**:
- **Problema de arranque (el más grave)**: sin tráfico nadie paga por estar, y sin tiendas no hay catálogo que genere tráfico. Es un doble cold-start autoinfligido.
- **Va contra el estándar local**: HardGamers indexa gratis. Cualquier tienda a la que le quieras cobrar por listar ya está gratis en el competidor.
- **Rompe la propuesta de valor al usuario**: si solo aparecen las tiendas que pagan, el comparador deja de ser el "mejor precio de Argentina" y pasa a ser un catálogo parcial. El usuario lo detecta y no vuelve. La completitud del índice ES el producto.
- **Incentivo perverso**: presión por retener tiendas pagadoras → menos objetividad en el ordenamiento.

**Veredicto**: descartado como modelo de entrada. Solo viable como componente premium (destacados) una vez que haya tráfico.

## Opción B — Indexar gratis + cobrar por venta referida (CPA / afiliación)

**Cómo funciona**: se indexa todo gratis; se cobra una comisión (2–5%) por venta atribuida al clic desde nuestro sitio. Con Mercado Libre ya existe infraestructura (Programa de Afiliados, 2–4% en Computación, lanzado nacionalmente en 2026).

**Fortalezas**: alineación perfecta de incentivos (la tienda solo paga si vende); sin fricción para sumar tiendas; se puede empezar a facturar desde el día uno vía afiliados de ML sin negociar con nadie.

**Puntos débiles**:
- **Atribución**: las tiendas chicas argentinas (Tiendanube, WooCommerce, plataformas propias) rara vez tienen tracking de afiliados. Habría que darles un pixel/postback o confiar en su reporte → fricción técnica y riesgo de subdeclaración de ventas.
- **Confianza asimétrica**: no podés auditar cuántas ventas realmente generaste en la tienda. El incentivo de la tienda es no reportar.
- **Comisiones bajas en notebooks**: es una categoría de margen chico (3–8% para el retailer). Nadie te va a pagar 5%; lo realista es 1–3% de tickets que, aunque altos, requieren mucho volumen para mover la aguja.
- **Ciclo de compra largo**: el usuario compara hoy y compra en 2 semanas desde otro dispositivo → pérdida de atribución (cookies, ventanas cortas).
- **Dependencia de Mercado Libre**: si el grueso del ingreso viene del programa de afiliados de ML, un cambio unilateral de comisiones o condiciones te reconfigura el negocio.

**Veredicto**: el mejor modelo para la etapa inicial (sobre todo vía ML y las pocas tiendas grandes con programa de afiliación), pero difícil de escalar con tiendas chicas por el problema de atribución.

## Opción C — CPC: cobrar por clic saliente (modelo Idealo/Geizhals)

**Cómo funciona**: la tienda paga por cada clic que le derivamos (en Europa, €0,20–0,80 según categoría). No requiere tracking de conversión, solo de clics — que controlamos nosotros.

**Fortalezas**: es el modelo maduro de la industria de comparadores; la medición es nuestra (sin confiar en la tienda); precio ajustable por categoría y por demanda; escala linealmente con el tráfico.

**Puntos débiles**:
- **Requiere volumen y marca**: ninguna tienda paga por clics de un sitio sin tráfico demostrado. Es un modelo para el año 2+, no para el lanzamiento.
- **Educación de mercado**: en Argentina ninguna tienda está acostumbrada a pagar CPC a un comparador (HardGamers no lo hace). Hay que evangelizar y probar ROI con datos.
- **Fraude de clics / calidad de tráfico**: hay que invertir en anti-fraude y en demostrar calidad, o las tiendas cancelan.
- **Riesgo de churn en crisis**: en recesión, el presupuesto de marketing de tiendas chicas es lo primero que se corta.

**Veredicto**: el modelo objetivo de mediano plazo. Migrar de B a C cuando haya tráfico que lo justifique (ej.: >100k clics salientes/mes).

## Opción D — Publicidad y destacados (modelo HardGamers)

**Cómo funciona**: banners de marcas/tiendas, posiciones destacadas, "tiendas oficiales", newsletter esponsoreada. Es lo que hoy monetiza HardGamers.

**Fortalezas**: no interfiere con la completitud del índice; las *marcas* (Lenovo, HP, Asus) tienen presupuestos de co-marketing mucho más grandes que las tiendas; complementa cualquier otro modelo.

**Puntos débiles**:
- **También requiere audiencia** (aunque menos que CPC): las marcas piden mediakit con tráfico real.
- **Techo bajo**: la publicidad display en un nicho argentino factura poco; no sostiene sola una empresa.
- **Conflicto de interés visible**: si los "destacados" pagos se mezclan con resultados orgánicos sin etiquetar, se erosiona la confianza — el activo principal.

**Veredicto**: complemento, nunca modelo principal. Etiquetar siempre lo esponsoreado.

## Opción E — Datos e inteligencia de precios (B2B)

**Cómo funciona**: vender a tiendas y marcas reportes de pricing competitivo (posición de precio vs. mercado, evolución, share of shelf) o API del índice.

**Fortalezas**: subproducto casi gratis del scraping que ya hacemos; ticket alto; las marcas pagan por saber a qué precio se vende su producto en cada retailer.

**Puntos débiles**:
- Mercado de clientes chico en un nicho de un solo país; venta consultiva lenta.
- Posible tensión: vender datos sobre las mismas tiendas que querés tener como partners.

**Veredicto**: vertical secundaria interesante para el año 2+, con la base de datos ya construida.

## Recomendación: secuencia por fases

| Fase | Momento | Modelo | Objetivo |
|---|---|---|---|
| 1 | Lanzamiento → 12 meses | **Gratis para todos + afiliación (B)** donde exista (ML y grandes retailers) + AdSense básico | Maximizar catálogo, tráfico y confianza. Facturación testimonial. |
| 2 | Con tracción (~50–100k visitas/mes) | Sumar **destacados y publicidad (D)** etiquetados + acuerdos CPA directos con tiendas medianas | Primeros ingresos B2B sin romper completitud. |
| 3 | Escala (año 2+) | Migrar tiendas de alto volumen a **CPC (C)**; mantener gratis el listado base | Modelo principal de la industria, medición propia. |
| 4 | Madurez | **Datos B2B (E)** + expansión a categorías adyacentes | Diversificación. |

**Principio rector**: el índice completo y objetivo es el producto. Cualquier vertical que lo comprometa (cobrar por estar, ocultar tiendas no pagadoras, mezclar pago con orgánico sin etiquetar) destruye más valor del que genera.
