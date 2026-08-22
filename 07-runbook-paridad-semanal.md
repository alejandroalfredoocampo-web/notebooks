# Runbook — revisión semanal de paridad

Procedimiento de la tarea programada **`paridad-cordoba-notebooks-semanal`** (vive en
`~/.claude/scheduled-tasks/`). Corre los lunes a la mañana y contesta una pregunta:

> ¿Córdoba Notebooks aprendió algo esta semana en seguridad, SEO/LLMO o UX que a este sitio
> le sirva, y sigue en pie lo que ya trajimos?

El estado entre corridas vive en **`paridad-estado.json`**, en la raíz de este proyecto. Sin
ese archivo la revisión no tiene punto de partida y volvería a auditar todo desde cero cada
semana.

---

## Por qué existe

Córdoba Notebooks avanza más rápido que este proyecto y **paga los errores primero**: tiene
más tráfico, cobra con tarjeta y tiene un equipo mirándolo. Casi todo lo que aprende en
seguridad, datos estructurados y mobile aplica igual acá, y llega gratis.

El riesgo de no hacerlo con método es el conocido: cuando pasan dos meses sin emparejar, el
diff se vuelve inmanejable y se abandona. NotebooksAr lo resolvió con un punto de divergencia
anotado (`02-pairing-con-cordoba-notebooks.md`). Esto es lo mismo, automatizado y semanal, así
que cada corrida mira entre cinco y veinte revisiones y no doscientas.

---

## Las dos direcciones

Cada corrida mira para los dos lados, y el segundo es el que más se olvida:

1. **Qué trajo Córdoba Notebooks** que acá sirva.
2. **Qué se rompió acá** desde la semana pasada. Un canonical que alguien sacó sin querer, una
   ruta nueva que no entró al sitemap, una cabecera que se cayó. Es más barato encontrarlo a
   los siete días que a los siete meses.

---

## El procedimiento

### 1. Ubicar los dos proyectos

```bash
CN=$(ls -d ~/Claude/Projects/C*rdoba\ Notebooks)/Ecommerce\ y\ pagos/reconstruccion-sin-woocommerce
NB=~/Claude/Projects/Notebooks.com.ar
```

El nombre de la carpeta de Córdoba usa **NFD** (`Co` + U+0301) y escribirlo literal en bash
crea un directorio fantasma. Seleccionarla siempre con el glob.

### 2. Ver qué cambió

```bash
DESDE=$(jq -r .ultimaRevision.commitCN "$NB/paridad-estado.json")
cd "$CN" && git log --oneline "$DESDE"..HEAD -- storefront/ src/ scripts/
```

Si no hay revisiones nuevas que toquen esas rutas, la corrida termina ahí: se anota la fecha
en el historial y no se toca nada. **Una semana sin cambios es un resultado válido** y no hay
que inventarle trabajo.

Los documentos numerados de `$CN/*.md` son la otra mitad: ahí están las auditorías con el
razonamiento, que casi siempre valen más que el diff.

### 3. Clasificar cada revisión

Tres categorías, y hay que ser estricto con la tercera:

| Categoría | Qué hacer |
|---|---|
| **Transversal** — seguridad, cabeceras, datos estructurados, canonical, sitemap, `llms.txt`, accesibilidad, mobile, performance, atribución | Portar, adaptado |
| **De comercio** — carrito, checkout, pagos, pedidos, stock, admin de comercio, Dux, HubSpot | Descartar. Un indexador no vende |
| **Dudosa** | Anotarla en el informe con la duda escrita. **No** implementarla por las dudas |

Al portar, la adaptación no es mecánica. Lo que allá es una tienda que vende, acá es un sitio
que manda tráfico a otras: el `Product` lleva una oferta **por tienda**, el CTA es "Ir a la
tienda" y no "Comprar", y el `Organization` no es un `OnlineStore`.

### 4. Chequear regresiones acá

```bash
cd "$NB/website"
npm test                                    # los tests unitarios
npm run chequear -- http://localhost:3000   # con el dev server levantado
npm run chequear -- <URL de producción>     # si está desplegado
npx tsc --noEmit && npm run build
```

`npm run chequear` cubre cabeceras, CSP, indexación, las rutas públicas, sitemap, `llms.txt`,
datos estructurados y que el admin y el portal sigan cerrados.

### 5. Mobile, sólo si se tocó UI

Si la semana trajo cambios de interfaz, **medirlos en un navegador** a 375×812 y 360×640, no
deducirlos del código. Las cuatro medidas que importan acá:

- Distancia hasta el primer **"Ir a la tienda"** en una ficha (es lo único que se factura).
- `scrollWidth` contra `clientWidth` (scroll horizontal).
- Alto de las áreas táctiles (mínimo 44px, 40 en listas densas).
- `font-size` de los campos de formulario (16px o iOS hace zoom al enfocar).

**No dar por buenos los hallazgos que no se midieron.** En la auditoría del 22-ago de Córdoba
Notebooks, dos de los hallazgos más vistosos eran falsos y venían con la aritmética hecha y
marcados "CONFIRMADO".

### 6. Cerrar

- Rama `paridad-<AAAA-MM-DD>`, un commit por tema, **sin desplegar y sin mergear a main**.
- Actualizar `paridad-estado.json`: mover lo que estaba en `ultimaRevision` al `historial` y
  poner el commit de CN nuevo.
- Informe corto en `paridad/AAAA-MM-DD.md`: qué se trajo, qué se descartó **y por qué**, qué
  se rompió acá, y qué queda pendiente que necesite una decisión de la persona.

---

## Lo que la tarea NO debe hacer

- **No desplegar.** Nunca.
- **No mergear a `main`.** La rama queda para revisar.
- **No tocar nada dentro de la carpeta de Córdoba Notebooks.** Es sólo lectura.
- **No portar el asistente con IA** ni ningún endpoint que genere costo recurrente sin que la
  persona lo haya decidido.
- **No inventar trabajo.** Si no hubo cambios relevantes, decirlo en una línea y terminar.
