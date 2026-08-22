# Correr la revisión de paridad sin tu máquina prendida

Qué hace falta para que lo que hoy corre como tarea local pase a correr solo en la nube.

**La respuesta corta: menos de lo que parece.** Los dos repos ya están en GitHub y
sincronizados, así que el bloqueo que uno imagina —"hay que subir las carpetas"— no existe.
Lo que queda es un secreto y una decisión de plata.

---

## De qué se compone la tarea, y qué necesita cada parte

La revisión semanal hace tres cosas distintas, y **sólo una de las tres necesita un modelo de
lenguaje**. Conviene separarlas, porque tienen requisitos y costos muy distintos:

| Parte | Qué hace | ¿Necesita IA? | ¿Corre en la nube hoy? |
|---|---|---|---|
| **A. Verificación** | 76 pruebas: unitarios, tipos, build, seguridad, SEO, humo, regresión, integración | No | **Sí, ya está hecho** |
| **B. Detección** | Ver qué commits nuevos tiene Córdoba Notebooks y avisar | No | **Sí, ya está hecho** — falta la deploy key |
| **C. Criterio** | Leer esos commits, decidir qué aplica, adaptarlo y escribirlo | **Sí** | Necesita una decisión tuya |

La parte A es la que más veces te va a salvar y no necesita nada de nadie.

---

## Punto de partida: lo que ya existe

| Cosa | Estado |
|---|---|
| `Notebooks.com.ar` en GitHub | ✅ `alejandroalfredoocampo-web/notebooks`, al día |
| **Córdoba Notebooks en GitHub** | ✅ `alejandroalfredoocampo-web/cordoba-notebooks`, al día |
| GitHub Actions andando | ✅ ya corren el scrape diario y el worker de emails |
| Secretos de Supabase cargados | ⚠️ están `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`; **falta `SUPABASE_ANON_KEY`** |

Que Córdoba Notebooks ya esté en GitHub es lo que hace que esto sea fácil: la comparación
necesita su historial de git, y ya está donde se lo puede leer.

---

## Parte A — la verificación: **ya está lista**

`.github/workflows/verificar.yml` corre la suite completa en cada push a `main`, en cada PR y
todos los lunes 9:40. No necesita IA, no necesita tu máquina y no cuesta nada (Actions es
gratis en repos privados hasta 2.000 minutos por mes; esto usa unos 4 por corrida).

**Lo único que falta para prenderlo:**

> GitHub → el repo → Settings → Secrets and variables → Actions → New repository secret
> - **Nombre:** `SUPABASE_ANON_KEY`
> - **Valor:** la anon/publishable key (la que empieza con `sb_publishable_`, **no** la
>   `service_role`)

Es la única key que la suite necesita: lee y no escribe, así que darle la `service_role`
sería regalarle permisos que no usa.

Sin ese secreto el workflow falla en el primer paso con un mensaje que dice exactamente esto,
en vez de fallar más adelante por una razón que no se entiende.

### Por qué el schedule semanal, además del push

Casi todo lo que estas pruebas vigilan **se puede romper sin que nadie toque el código**: una
tienda que cambia su HTML y deja de matchear, la API del dólar que cambia de forma, un modelo
que se queda sin ofertas, un certificado que vence. Un CI que corre sólo en push contesta "el
último commit no rompió nada", que no es la pregunta que uno tiene.

---

## Parte B — la detección: **ya está lista**

`.github/workflows/detectar-paridad.yml` corre los lunes 9:50, compara `paridad-estado.json`
contra el `HEAD` de Córdoba Notebooks y **mantiene un issue al día** con lo que falta mirar.

No decide, no porta y no toca código: te avisa. El criterio lo ponés vos, o una corrida local
de la tarea semanal cuando tengas ganas.

### Un issue vivo, no doce issues muertos

La tentación es abrir un issue por semana. A los tres meses son doce hilos abiertos que dicen
casi lo mismo y nadie lee ninguno.

Este mantiene **uno solo**:

| Situación | Qué hace |
|---|---|
| Hay pendientes y no hay issue | Lo abre |
| Hay pendientes y el issue existe, con novedades | Actualiza la descripción **y** comenta |
| Hay pendientes y el issue existe, sin novedades | Actualiza y **no** comenta |
| No hay pendientes y el issue existe | Comenta que se emparejó y lo **cierra** |

Ese "no comenta si no hay novedades" es lo que evita que el hilo se vuelva ruido: un aviso
semanal que repite lo mismo entrena a la gente a ignorarlo. El estado no vive en ningún lado
raro — es un marcador HTML invisible en el cuerpo del propio issue.

Y el ciclo se cierra solo: cuando hacés la revisión y actualizás `paridad-estado.json`, el
lunes siguiente no encuentra nada y cierra el aviso.

### La clasificación ordena, no decide

El script etiqueta cada commit por palabras del asunto: *probablemente transversal*,
*probablemente de comercio*, o *sin clasificar*. Eso alcanza para ordenar una lista de veinte
y no alcanza para decidir nada — un commit que dice "checkout" puede estar tocando la CSP.

**En la duda cae en "sin clasificar" y alguien la mira.** No se adivina.

También lista los documentos `.md` que se tocaron en Córdoba Notebooks, que suelen valer más
que el diff: ahí está escrito el *por qué*.

Se puede correr a mano, y no necesita CI:

```bash
cd website && node scripts/detectar-cambios-cn.mjs
```

### Lo único que falta: cargar la deploy key

`cordoba-notebooks` es privado, así que el workflow necesita una credencial de lectura. Ya
generé el par de claves; sólo hay que pegarlas en dos lugares.

**1. La pública, en Córdoba Notebooks** (le da acceso de lectura a ese repo, y a nada más):

> GitHub → `alejandroalfredoocampo-web/cordoba-notebooks` → Settings → **Deploy keys** →
> Add deploy key
> - **Title:** `notebooks CI (paridad, solo lectura)`
> - **Key:** el contenido de `~/.ssh/notebooks_paridad_deploy.pub`
> - **Allow write access:** ⛔ **dejalo destildado**

```bash
cat ~/.ssh/notebooks_paridad_deploy.pub | pbcopy   # queda en el portapapeles
```

**2. La privada, como secreto en este repo:**

> GitHub → `alejandroalfredoocampo-web/notebooks` → Settings → Secrets and variables →
> Actions → New repository secret
> - **Nombre:** `CN_DEPLOY_KEY`
> - **Valor:** el contenido de `~/.ssh/notebooks_paridad_deploy` (la **sin** `.pub`)

```bash
cat ~/.ssh/notebooks_paridad_deploy | pbcopy
```

> ⚠️ Pegala completa, **incluidas** las líneas `-----BEGIN...` y `-----END...` y el salto de
> línea final. Es el error más común y falla con un mensaje que no lo dice.

Por qué una deploy key y no un token personal: un PAT da acceso a **todo** lo que vos podés
ver en GitHub. Esta clave sirve para leer un solo repositorio y nada más, así que el peor caso
si se filtra está acotado a eso. Y se revoca borrándola de Deploy keys, sin tocar tu cuenta.

Después de cargarla, probala a mano: Actions → **Detectar paridad** → Run workflow.

---

## Parte C — el criterio: acá está la decisión

Leer los commits de Córdoba Notebooks, entender qué resuelven, decidir cuáles aplican a un
indexador, adaptarlos y escribir el informe **necesita un modelo**. Eso implica dos cosas.

### La plata

Correr Claude Code en GitHub Actions requiere una credencial de tu cuenta, cargada como
secreto (`ANTHROPIC_API_KEY`, o el token de una suscripción Max). O sea: **un gasto recurrente
que hoy no existe**, porque la tarea local corre dentro de tu suscripción.

Una corrida semanal de esto —leer entre cinco y veinte commits, decidir, y a veces escribir
código— es del orden de unos pocos dólares. Con veinte semanas eso es real pero chico. **No es
una decisión que pueda tomar por vos**, y es la misma razón por la que no porté el asistente
con IA de Córdoba Notebooks.

### Lo que no se puede automatizar del todo, y conviene saberlo

Aunque pongas la credencial, hay una parte que **no debería** correr sola:

- **La medición de mobile necesita un navegador.** En CI eso es Playwright: unos 300 MB de
  descarga por corrida (cacheables) y unos minutos más. Es la única forma de medir de verdad
  la distancia hasta el "Ir a la tienda", el scroll horizontal y las áreas táctiles. Se puede
  hacer; hay que quererlo.
- **Nada de esto debería mergear ni desplegar solo.** El runbook ya lo prohíbe. Un agente que
  abre una rama y un informe es útil; uno que mergea a `main` sin que nadie mire es cómo se
  rompe un sitio un domingo.

---

## Lo que yo recomendaría

1. **Ahora, dos secretos y listo:** `SUPABASE_ANON_KEY` para la parte A y `CN_DEPLOY_KEY` para
   la B. Las dos son gratis, no requieren decidir nada, y entre las dos cubren "¿se rompió
   algo?" y "¿hay algo nuevo para traer?", que son las dos preguntas de la revisión semanal.
2. **La parte C, dejala local por ahora.** Corre dentro de tu suscripción, no cuesta aparte, y
   una revisión de paridad que produce una rama y un informe conviene que ocurra cuando vos
   estás para leerla. Si en unos meses el hábito está tomado y te cansa depender de tener la
   app abierta, ahí sí tiene sentido pagarle un lugar en la nube.

La tarea local que quedó configurada no se pisa con nada de esto: si mañana la parte A corre
en Actions, la tarea local simplemente encuentra todo verde más seguido.

---

## Nota

Las tres partes son independientes: se pueden prender en cualquier orden y ninguna necesita a
las otras. No hay que decidir todo junto.
