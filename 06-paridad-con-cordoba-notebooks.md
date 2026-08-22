# Paridad con Córdoba Notebooks — 2026-08-22

Auditoría del trabajo hecho en Córdoba Notebooks en las últimas semanas y qué de eso se
trajo al comparador. Todo lo que sigue está en la rama **`paridad-cordoba-notebooks`** y
**nada está desplegado**: leé primero "Lo que falta y es tuyo", al final.

---

## Antes que nada: una corrección sobre la premisa

El pedido fue "clonar el sitio de Córdoba Notebooks". Eso no es literalmente posible y
conviene decir por qué antes de listar lo que sí se hizo.

**Córdoba Notebooks es una tienda.** Su storefront (Next 15 + Medusa + Mercado Pago, en
`Ecommerce y pagos/reconstruccion-sin-woocommerce/storefront`) tiene carrito, checkout,
Payment Brick, cuentas de cliente, pedidos, garantías, stock desde Dux y un admin de
comercio. **Notebooks.com.ar es un indexador**: no vende, no cobra y no tiene inventario. Su
producto es el click saliente hacia la tienda.

De las **55 revisiones** que Córdoba Notebooks acumuló en la ventana relevante, la mayoría
son de backend de comercio, panel de admin, integración con Dux y HubSpot, deploy y
monitoreo. Nada de eso tiene contraparte acá.

Lo que **sí** transfiere —y es donde está casi todo el valor de esas semanas— es la capa
transversal: seguridad, SEO/LLMO, performance, mobile y atribución. Eso es lo que se portó,
adaptado al modelo de comparador. Hay precedente exacto de este ejercicio: NotebooksAr hizo
el mismo pairing en agosto y llegó a la misma conclusión sobre el backend
(`~/Claude/Projects/NotebooksAr/02-pairing-con-cordoba-notebooks.md`).

Cuando la adaptación cambió el sentido de algo, está dicho abajo.

---

## Método

Se leyó el storefront de Córdoba Notebooks archivo por archivo, con foco en los 41
documentos de la carpeta —en particular la auditoría integral del 22-ago (doc 41), la de
seguridad pre-producción (doc 20) y la de SEO/LLMO (docs 10, 33 y 34)— y se contrastó cada
pieza contra el código del comparador.

Lo de mobile **está medido en un navegador**, a 375×812 y 360×640, antes y después. No
deducido del código. Es la lección de método del doc 41: dos de los hallazgos más vistosos
de esa noche eran falsos y venían con la aritmética hecha y marcados "CONFIRMADO".

---

## Seguridad

### Lo que estaba abierto

**1. El admin podía estar protegido por una contraseña pública.** `ADMIN_PASSWORD` caía en
`"notebooks-admin"` y `ADMIN_SESSION_TOKEN` en `"dev-admin-session-token"` cuando faltaba la
variable de entorno. Los dos strings estaban en el repositorio. O sea que un deploy al que
le faltara una de las dos —el error más común que existe— quedaba abierto **y no fallaba de
ninguna forma visible**: el admin andaba perfecto. Ahora falta la variable y no entra nadie.

Ojo con esto al desplegar: si hoy `ADMIN_SESSION_TOKEN` no está en Vercel, el admin está en
esa condición **ahora mismo**. Está en el checklist.

**2. El informe de inteligencia de precios de cualquier tienda era público.**
`GET /api/portal/insights?storeId=X` devolvía la posición competitiva de esa tienda: su
precio contra el mejor del mercado, en cuántos modelos gana y pierde, y por cuánto. El
comentario del archivo decía "MVP: abierto sobre data pública", y la premisa es cierta a
medias — **cada precio suelto es público, el análisis no**. Los `storeId` están en
`/tiendas`, así que un competidor bajaba el informe de todas las tiendas del comparador en
un `for`. Y es el producto que la spec 11 pensaba cobrar. Ahora exige el token de un miembro
de esa tienda, verificado contra Supabase y contra `store_members`.

**3. Cinco endpoints `POST` públicos sin ningún techo.** Alta de alerta de precio, aviso de
disponibilidad, solicitud corporativa, alta de tienda y login del admin. El peor no es el
login: es `/api/alertas`, que guarda una dirección de correo que **después recibe mail
nuestro**. Un script con 50.000 direcciones ajenas convierte el sistema de alertas en un
remitente de spam, y lo que se quema es la reputación del dominio — o sea, la entrega de los
mails que sí importan. Ahora hay rate limit por IP con contador atómico en la base.

**4. Los cinco devolvían el `error.message` de Supabase.** Ese texto trae el nombre de la
tabla, el de la columna, el de la constraint y a veces el valor que la violó: un mapa del
esquema servido a cualquiera que mande un formulario mal a propósito.

**5. Seis URLs del alta de tienda entraban sin validar.** Instagram, Facebook, TikTok,
YouTube, LinkedIn y Mercado Libre. Sólo el sitio web pasaba por un `/^https?:\/\//`. Esas
columnas se renderizan como `href` en la bandeja de aprobación del admin, así que un
`javascript:...` es XSS almacenado que se dispara **en una sesión con permisos sobre el
catálogo entero**.

**6. La validación de email era `includes("@")`.** `"@"` sola pasaba. `"a@b"` también, que es
peor: entra a la base, el worker intenta enviarle y el rebote va contra la reputación del
dominio.

**7. `/salir/[listingId]` emitía `Location` con el esquema que tuviera la URL scrapeada.**
La URL sale de HTML de otra empresa. Los navegadores modernos ignoran un `Location:
javascript:`, pero "el navegador lo tapa" no es una defensa.

### Cabeceras

El sitio no mandaba **ninguna**. En un indexador eso pega distinto que en una tienda:

- **Sin `frame-ancestors`, el sitio era enmarcable.** Acá el click saliente **es** el
  producto: es lo que se le factura a la tienda. Un tercero que enmarca el sitio y genera
  clicks está falsificando el inventario que se vende.
- **El token de baja de alertas viajaba en el `Referer`.** El link del mail es
  `/baja?id=…&t=<hmac>`.
- **Sin CSP, un script comprometido reescribe los precios.** La credibilidad de un
  comparador es que el número que muestra es el que cobra la tienda.

Se agregaron CSP (en report-only, con flag), `X-Frame-Options`, `X-Content-Type-Options`,
`Referrer-Policy`, `Permissions-Policy`, HSTS con preload, COOP, y se apagó el header de
"hecho con Next".

**La CSP arranca en report-only a propósito.** El doc 20 de Córdoba Notebooks daba por hecho
que pasarla a enforce era "prender un flag sin tocar código", y no lo era: faltaban cuatro
orígenes que sólo aparecieron mirando lo que el sitio pide de verdad. Acá el procedimiento
está escrito en `next.config.mjs` y en `.env.example`.

**La única excepción de la política es `img-src https:`, y es deliberada.** Las imágenes de
producto son de las tiendas indexadas y el conjunto de hosts crece cada vez que se suma una
tienda. Una lista blanca se rompería en silencio: la imagen desaparece de la ficha y nadie
mira los logs.

### Atribución del click saliente

No es sólo seguridad, es lo que hace medible el negocio. El click-out se registraba con el
`referer` de la página anterior y nada más — y para cuando alguien aprieta "Ir a la tienda"
ya navegó tres páginas, así que ese referrer es el propio sitio. **No había forma de saber
de dónde vino la visita que generó el click que se factura.**

Ahora el middleware captura el origen (utm, `gclid`/`fbclid`/`ttclid`, referrer externo) en
una cookie `HttpOnly` de primera parte, con primer toque y último toque y ventana de 90 días
que no se renueva sola. El redirect lo guarda junto al click. Los clicks de bots se marcan en
vez de descartarse: borrarlos deja un hueco que la tienda va a discutir.

---

## SEO y LLMO

### La pieza central: el schema de la ficha

Lo que había declaraba un `Product` con `AggregateOffer` y nada más. Para un buscador eso es
una página con un rango de precios y **ninguna forma de saber quién vende a cada uno**. Para
un asistente al que le preguntan "¿dónde está más barata?", no hay respuesta.

Ahora la ficha emite un grafo con tres cosas atadas por `@id`:

- el `Product`, con una `Offer` **por publicación** y su `seller`;
- el nodo de cada **tienda** al que ese `seller` apunta — sin él la referencia queda colgada
  y Google descarta el bloque entero;
- la miga de pan.

Ese nodo de tienda es el mismo `@id` que emiten la ficha de la tienda y el listado de
tiendas, así que para un buscador es **una** entidad con su reputación y su dirección, y no
tres nombres sueltos.

Lo que **no** se declara, y por qué: `aggregateRating` en el producto (no hay reseñas de
producto; el rating que tenemos es de la tienda y ponerlo en el equipo sería decir que el
equipo tiene 4,6 estrellas), `shippingDetails` y política de devolución (son de cada tienda y
no las conocemos por publicación), y `gtin` (no hay códigos cargados; emitirlo sería declarar
un identificador nulo en todo el catálogo).

### Canonical por ruta

Faltaba en la home, el listado, ofertas, comparar, marcas, tiendas, corporativo, blog y
privacidad. Sin canonical, cada URL con `?utm_source=…` entra al índice como página propia y
compite con la original por su propio ranking.

No se puede poner en el layout: la metadata se hereda, así que un canonical ahí hace que el
sitio entero se declare copia de la home.

### Las facetas, que eran una trampa

`/notebooks?marca=lenovo&ram=16&sort=precio` genera una página por combinación: son miles,
todas con el mismo contenido reordenado. Ahora la vista filtrada emite `noindex, follow` y su
canonical apunta al listado limpio.

`follow` y no `nofollow`: los links a las fichas sí hay que seguirlos. Y no alcanzaba con
`robots.txt` — una URL bloqueada que ya está en el índice **no se puede desindexar**, porque
Google no puede leer el `noindex` que la sacaría. Hacen falta los dos, y en ese orden.

### `/llms.txt`

El comparador explicado para un modelo de lenguaje, generado del mismo catálogo que el sitio.
Incluye lo que un modelo no puede deducir del HTML: qué significa "oferta real" (5% debajo del
promedio de 90 días), qué se considera "sin interés" (2% de tolerancia sobre el contado), la
frescura de cada dato, y **las limitaciones** — que el catálogo cubre las tiendas indexadas y
no todo el mercado, y que el archivo es una foto.

Declara explícitamente el corte de 400 modelos en vez de truncar en silencio: un corte mudo
se lee como "esto es todo el catálogo".

### El sitemap

`lastmod` real sólo donde hay una fecha honesta: el `lastSeenAt` más reciente de las
publicaciones de un modelo, el `updatedAt` de un artículo. Las páginas estáticas y las de
tienda no llevan fecha, porque no hay ninguna que se pueda afirmar. Un sitemap donde las
3.000 URLs dicen "modificada hoy" en cada build le enseña a Google que la fecha de este sitio
no significa nada, y entonces la ignora **también** en las que sí cambiaron.

Faltaba `/comparar`, que está enlazado desde el header de todo el sitio. Es el hueco que en
Córdoba Notebooks se tapó tres veces, siempre igual: una sección enlazada desde la navegación
que no está en el sitemap, y que el chequeo de regresión no ve **porque el chequeo recorre el
sitemap**.

### La capa de prosa: `/guias`

La auditoría del 22-ago de Córdoba Notebooks marcó esto como **el ítem de mayor retorno en
LLMO y el más lento**: "el sitio tiene los datos y no la respuesta". Acá pasaba igual — a
"¿qué notebook conviene para diseño gráfico?" lo único que había para citar era una grilla de
tarjetas. Una grilla no se cita: se resume, y el resumen lo escribe el modelo con lo que ya
sabía.

Cinco guías (estudiar, gaming, diseño, programar, oficina). Cada una abre con la **respuesta
en prosa, autocontenida** —lo que se cita tiene que entenderse sin el resto de la página—,
sigue con el criterio en números y su porqué, los errores caros de ese uso, y termina con los
modelos del catálogo que hoy cumplen el criterio, ordenados por precio.

El filtro de cada guía es un predicado sobre specs y **no** el campo `use_cases` de la base:
ese viene curado a mano y está vacío en la mayoría de los modelos scrapeados, así que una
guía que dependiera de él mostraría tres equipos de cuarenta.

Las FAQ se renderizan siempre, nunca dentro de un acordeón que desmonte el nodo. Es la
lección más cara del otro proyecto: las pestañas de la ficha se montaban con `tab === "x" &&`,
y **Googlebot ejecuta JavaScript pero no hace click en pestañas**, así que la descripción que
la empresa pagaba por generar y un vendedor aprobaba a mano no llegaba a ningún buscador por
ningún camino.

Los cinco casos de uso de la home ahora llevan acá y no a `/notebooks?use=`. Eran cinco de los
links más prominentes del sitio apuntando a vistas filtradas, que además son `noindex`.

### El resto

`/opengraph-image` generada en el build (en Argentina el canal por el que se comparte un
precio es WhatsApp, así que esa imagen es la portada del sitio para la mayoría de las visitas
por recomendación); `noindex` en cuenta, favoritos, ingresar y portal, vía layouts —los
componentes de cliente no pueden exportar `metadata`—; robots con los crawlers de modelos
permitidos explícitamente, que es una decisión de negocio y conviene que esté escrita; y
`JsonLd` escapando `<`, porque los nombres vienen de scrapers sobre HTML ajeno y un
`</script>` en el título de una publicación no es hipotético.

---

## Mobile

Medido a 375×812 y 360×640, antes y después.

| Qué | Antes | Después |
|---|---|---|
| Primer "Ir a la tienda" en la ficha | 1.584px (1,95 pantallas) | **Barra fija, siempre visible** |
| El `<h1>` y el precio en la ficha | abajo del pliegue | **449px y 165px** |
| Alto de las casillas de filtro | 22px | **40px** (38 de 38) |
| Campos de formulario | 13–14px → zoom de iOS | **16px** |
| Links del menú | 5, sin Guías | **8, todos de 44px** |
| Escape / bloqueo de scroll / fondo clickeable | ninguno | **los tres** |
| Scroll horizontal a 360px | ninguno | ninguno (verificado) |

El hallazgo grande es el **orden de la ficha**. En escritorio son dos columnas —foto y specs a
la izquierda, nombre y precios a la derecha— y en mobile eso se apilaba en el orden del HTML:
lo primero que veía alguien con un teléfono era una foto de 288px y la tabla de
especificaciones completa. El nombre del equipo y el precio quedaban abajo del pliegue.

La barra fija resuelve lo mismo que resolvió allá con el botón "Comprar" (1.673px). Y con el
mismo detalle: **el espacio que deja va en el `<body>`, no en el componente de la ficha**. Allá
el primer intento lo puso en el componente y el footer siguió tapado, porque el footer vive
fuera del árbol de la página.

---

## Performance

### El promedio de 90 días no era de 90 días

`price_history` se traía **entera**, sin filtro de fecha, y de ahí salía `avg90`. O sea que el
"promedio de los últimos 90 días" era el promedio de **todo** el historial — y esa cifra
sostiene la afirmación central del producto: la insignia de oferta verificada, el termómetro
de precio, y lo que `llms.txt` le declara a un modelo como definición de oferta real.

Hoy la diferencia es chica porque el historial es corto. Dentro de un año, el "promedio de 90
días" sería el promedio de cuatro trimestres y las ofertas dejarían de detectarse. Como el
mínimo pasa a ser el de la ventana, los dos textos que decían "mínimo histórico" ahora dicen
"mínimo en 90 días", que es lo que se puede afirmar.

El mismo filtro tapa una bomba de escala: la consulta crecía sin techo. Con 3.000 modelos y un
punto por día, al año son ~1.000.000 de filas traídas **en cada request**.

### Caché por etiqueta

Cada visita a cualquier página disparaba cuatro consultas de tabla completa; la home, cinco.
La decisión de "siempre en vivo" era correcta en su motivo —un comparador no puede mostrar el
precio de ayer— y cara en su implementación.

Cachear **por etiqueta** en vez de por tiempo conserva el motivo y saca el costo: el catálogo
se sirve del caché hasta que alguien avisa que cambió, y ahora avisan los dos únicos lugares
que lo cambian: el scraper al terminar de escribir, y las seis rutas del admin que tocan lo
público. El techo de cinco minutos es la red por si el aviso no llega.

`/api/revalidar` exige un secreto y falla cerrado sin él: un endpoint público que vacía el
caché en bucle es un DoS barato contra el plan de Supabase que no se ve como un ataque en
ningún log.

### Imágenes

Cero `next/image` en todo el sitio, y **se dejó así a propósito**, documentado en
`next.config.mjs`. Habilitar el optimizador para hosts de terceros exige `hostname: "**"`, y
eso hace dos cosas malas: deja `/_next/image?url=…` como **proxy abierto** (cualquiera sirve
una imagen arbitraria desde nuestro dominio) y ata la factura de optimización a cuántas
tiendas se indexen.

A cambio se tomaron las ganancias sin optimizador: `width`/`height` declarados (el salto de
layout de la grilla), la imagen de la ficha con `fetchPriority="high"` en vez de `lazy` —era
la del LCP y estaba diferida, o sea que se le pedía al navegador que la bajara después de
todo lo demás—, y `decoding="async"`.

---

## Herramientas que quedaron

- **`npm run chequear -- <origen>`** — verifica cabeceras, CSP, indexación, las 15 rutas
  públicas, sitemap, `llms.txt`, datos estructurados y que el admin y el portal sigan
  cerrados. Sale con código 1 si algo falla, así se puede colgar de un deploy o de CI.

  Está escrito con la lección de allá adelante: el chequeo de la CSP de Córdoba Notebooks
  **daba verde con la política rota**, porque probaba `csp.includes("mercadopago")` —
  confirmaba la palabra, no la capacidad. Acá cada chequeo prueba una capacidad: que
  `connect-src` cubra el origen que aparece en el HTML real, que cada `seller` del JSON-LD
  resuelva a un nodo declarado en la misma página, que la vista filtrada sea `noindex` **y**
  su canonical apunte al listado limpio.

- **`npm test`** — 29 tests unitarios sobre las piezas nuevas que son puras: atribución,
  validación de entrada, rate limiting, SEO y comparación en tiempo constante.

- **`.env.example`** — todas las variables, con qué pasa si falta cada una.

---

## Lo que NO se trajo, y por qué

### El backend de comercio

Carrito, checkout, Payment Brick de Mercado Pago, cuentas de cliente, pedidos, garantías,
comprobantes, stock desde Dux, integración con HubSpot, el admin de comercio y el sistema de
promociones bancarias. Son 38 de las 55 revisiones de esa ventana. **Un indexador no vende**:
no hay dónde poner nada de eso.

### El asistente de compras con IA

Córdoba Notebooks tiene un asistente conversacional con guardrails, evaluación de jailbreaks y
un techo de gasto de US$5/día decidido por Ale. Es la pieza que más se parece a algo que este
sitio podría querer.

**No se portó, y es una decisión que te corresponde:** es un endpoint público que convierte
requests en factura de la API de Anthropic, con costo recurrente y un techo que alguien tiene
que fijar. Encenderlo sin que el dueño lo decida sería crear un gasto por mi cuenta.

Además, buena parte de lo que resolvería ya lo resuelven las guías, y sin costo por consulta:
un modelo de lenguaje contestando "¿cuál me conviene para diseño?" es exactamente el contenido
de `/guias/diseno`, escrito una vez.

Si lo quieren, el camino está: `storefront/src/lib/asistente-*.ts` y `lib/limites.ts` de
Córdoba Notebooks son portables casi tal cual, cambiando el contador de D1 por el de Supabase
que ya quedó hecho acá.

### Los feeds de Google Shopping y Meta

No aplican: son feeds de productos que uno vende.

### `redirects.json` y las 410

Córdoba Notebooks migró desde un WordPress con 180 URLs indexadas y necesitó un mapa de
redirecciones. Notebooks.com.ar no tuvo un sitio anterior. Si lo tuvo y no está registrado en
el proyecto, **[PENDIENTE]** confirmarlo: es el tipo de cosa que se descubre tarde y mal.

### El pixel de Meta y GA4

Están latentes en el repo de Córdoba Notebooks y se activan solos el día que carguen los ids —
lo cual, según su propia auditoría, se llevaría el token de recuperar contraseña a Google y a
Meta. Acá no se agregó ninguno. La atribución first-party que sí se portó cubre la pregunta de
negocio (de dónde vino el click que se factura) sin mandarle nada a un tercero.

---

## Lo que falta y es tuyo

### 1. Preparar el entorno **antes** de mergear

`ADMIN_SESSION_TOKEN` pasó a ser obligatoria. Si hoy no está en Vercel, el admin está
protegido por un string público **ahora mismo** — y después del deploy va a contestar 503
hasta que la cargues. Los pasos exactos están en `DEPLOY-CHECKLIST.md`, en la sección nueva
del principio.

Lo mismo con las dos migraciones: `0014_clickout_atribucion.sql` **hay que correrla antes**, o
los clicks salientes dejan de registrarse (el redirect sigue funcionando; el registro no).

### 2. Desplegar y verificar

```bash
cd website && npm run chequear -- https://notebooks-tan.vercel.app
```

### 3. Prender la CSP, sin apuro

Dejarla en report-only unas semanas, mirar los avisos `[csp]` en los logs de Vercel, agregar
lo que falte a `next.config.mjs`, y recién ahí `CSP_ENFORCE=true`. No se prende de una: la
lista de orígenes que un sitio realmente usa no se deduce leyendo el código, y eso ya se pagó
una vez del otro lado.

### 4. Decisiones que no son técnicas

- **El asistente con IA**: si va, con qué techo de gasto.
- **Escribir más guías.** Las cinco cubren los usos frecuentes. Las que faltan y tienen
  demanda de búsqueda real son por presupuesto ("notebook hasta $800.000") y por
  característica ("notebooks livianas", "con 32 GB"). El sistema está y agregar una es
  escribir una entrada en `src/content/guias.ts`.
- **`[PENDIENTE]` los datos de la razón social.** El JSON-LD declara `Organization` sin
  `legalName` ni `taxID` porque no están cargados en el proyecto. Son la señal de confianza que
  casi ningún competidor declara, y no se inventan.

### 5. Lo que queda anotado y no hice

- **Las reseñas de tienda no se indexan** si alguna vez se cargan del lado del cliente. Hoy
  vienen del servidor, así que está bien; es una trampa a recordar.
- **El JWT de Supabase vive en `localStorage`**, legible por cualquier script. Es la misma
  deuda que anotó Córdoba Notebooks y el arreglo de fondo es el mismo: cookie `HttpOnly` más
  un proxy de las llamadas autenticadas. Es trabajo real, no de una tarde.
- **No hay un evento de `page_view` first-party.** Con la atribución del click ya se sabe de
  dónde viene el que hace click; falta el denominador (cuántos vieron y no hicieron click)
  para tener tasa de conversión por campaña. Es el siguiente paso natural y cuesta una
  escritura por visita, así que conviene decidirlo mirando el plan de Supabase.

---

## Nota

Los commits de la rama tienen el detalle técnico de cada cambio, con la evidencia y con lo
que se descartó. Lo que este documento no cubre y sería honesto decir: **no se desplegó ni se
verificó contra producción** —todo lo medido es contra el sitio corriendo en local con la base
real—, no se probó el rate limiting contra la tabla real porque las migraciones `0013` y
`0014` no están corridas, y la CSP no se ejercitó en modo enforce con Supabase Auth
configurado (localmente no lo está, así que el chequeo de `connect-src` quedó como aviso y no
como verificación).
