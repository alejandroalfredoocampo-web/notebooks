# Reunión Notebooks.com.ar — Fede, Tino y Alejandro — 20-oct-2026

Desgrabación completa con minutos: [2026-10-20-desgrabacion.md](2026-10-20-desgrabacion.md).
La grabación no separa voces, así que las posiciones se atribuyen a "la mesa" salvo donde
quedó claro quién hablaba. Los minutos entre paréntesis apuntan a la desgrabación.

---

## 1. Qué se decidió (resumen ejecutivo)

1. **Notebooks.com.ar sigue siendo un indexador/comparador**, no una tienda. Tres puntas de
   usuario: comprador, tienda, marca, más una cuarta: empresa (compra por volumen). (00:00–03:50)
2. **La monetización viene por las tiendas, no por el comprador.** Primero tráfico y
   credibilidad, después cobrar. Nadie paga al principio. (35:03, 43:14, 50:10)
3. **Regla de oro, dos veces repetida: no se le miente a nadie.** Ni al comprador (el ranking
   es siempre la mejor oferta real) ni a la tienda (no se le promete "vas a salir primero").
   Lo pago va en un espacio rotulado "Espacio patrocinado". (34:55–37:06, 44:29–44:52)
4. **Separar Notebooks.com.ar de Córdoba Notebooks.** Pauta y foco inicial apuntan al resto del
   país, no a Córdoba, para no canibalizar. Córdoba Notebooks entra como primer "espacio
   patrocinado / tienda destacada del mes" porque pagó, y eso queda explícito. (10:33–11:56,
   42:42–43:00, 44:17–45:13)
5. **La experiencia del comprador se rediseña alrededor de dos preguntas:** "¿qué compu
   buscás?" y "¿cómo la querés pagar?" (contado / cuotas / mejor opción general). Selector al
   lado del buscador; el resto del sitio se adapta a eso. Búsqueda tipo embudo o wizard con
   botones grandes. (18:40–22:40, 28:13–28:50)
6. **El gancho para las tiendas es el canal corporativo:** las licitaciones/pedidos de empresas
   que entren por el sitio se reparten **sólo entre tiendas suscriptas**. Eso es lo que
   justifica la suscripción cuando la tienda no tiene el mejor precio. (39:24–40:49,
   48:12–48:36)
7. **Primeros pasos acordados (46:15–47:30, 51:49–53:00):** rehacer la UX, destacar a Córdoba
   Notebooks como patrocinado, llenar el catálogo con todas las tiendas no bloqueadas,
   prender el cron diario, abrir dominio + Workspace + redes y arrancar la comunicación ya.
8. **Próxima reunión:** una hora más, martes de la semana que viene (27-oct). (53:51–53:58)

---

## 2. Notas por tema

### 2.1 Qué es y qué queremos que sea (00:00–05:30)
- Indexador de competidores que venden notebooks. Primero sirve para apalancar a Córdoba
  Notebooks y mostrarse como opción relevante; después se monetiza vendiendo posicionamiento y
  espacio premium a tiendas y marcas.
- Segunda pata: la empresa o entidad que quiere comprar varias compus arma el pedido en el
  portal (licitación / subasta).
- Lo que ya existe (versión anterior): índice sobre los modelos que vendía Córdoba Notebooks,
  cinco o seis competidores reales (Fullhard, Frávega, Mauri Computación, Maximus, Atex...),
  mejor precio absoluto, mejor en cuotas, mejor en condiciones (garantía), alerta de baja de
  precio por mail, historial de precios 90 días, sugerencias de SKU similares, comparador.
- Visión: "el portal de referencia para quien quiera comprar una notebook en Argentina".
- Cobro a tiendas: fee fijo o por click como máximo; nunca sobre transacciones porque no se
  puede medir. El argumento de venta es que el click es de calidad (alguien que ya buscó el
  equipo), no un click basura de Instagram.

### 2.2 Estrategia de arranque y a quién incluir (05:26–15:50)
- Córdoba Notebooks es el conejillo de indias, pero hay que rodearse de tiendas creíbles:
  "el que buscó un poquito ya vio este, este y este; que al entrar vea lo que ya estuvo
  buscando" (BenEx y similares, aunque nos ganen en algo).
- Apple queda afuera como prioridad: el que quiere una Mac no compara, va directo.
- Tensión señalada en la mesa: una base confiable y grande no va a ser una base donde Córdoba
  Notebooks gane siempre. Resolución: separar las dos cosas y apuntar al resto del país.
- Permisos de tiendas: somos indexadores, igual que Google; no cobramos comisión, mandamos
  tráfico. Se incluye a quien tiene scraping/bots permitidos en su código; quien lo tiene
  bloqueado (se mencionó Mauri Computación) se deja afuera o se le pide permiso. Cualquiera
  puede pedir que lo saquemos y hay que poder sacarlo.
- Catálogo: rehacer el listado de equipos con una lista actualizada, con **todas** las
  máquinas que vende Córdoba Notebooks. Cron diario a las 23:29 (puede correr en el agente de
  la otra compu). En la etapa 1 no se filtran tiendas, estén mejor o peor que nosotros.
- Sería sospechoso que Córdoba Notebooks sea el único "premium reseller destacado"; sumar al
  menos otra tienda conocida (NotebooksAr no sirve: comparte los datos de esta oficina).
- Medusa ya trackea referrals, así que se va a poder ver cuánto tráfico llega desde el portal.

### 2.3 La experiencia del comprador (15:57–28:57)
- Hoy el sitio tiene buscador, comparador, "semáforo", stock / sin stock, verificados. Hay que
  revisar el semáforo (no está actualizado) y deschequear los verificados que no lo son.
- Perfil "Doña Rosa": no sabe de hardware, necesita confianza, le importa precio, cuotas o
  garantía según el caso.
- El foco del sitio **no** es la comparación técnica, es "te consigo la promo que te
  conviene". Selector de forma de pago al lado del buscador: un click reordena la lista
  (12 cuotas / contado / mejor opción general calculada).
- Búsqueda como embudo: "¿en cuotas? listo. ¿qué marca o procesador? listo. ¿qué te importa
  más ahora, garantía o envío?". Mezcla de wizard y resultados; botones claros arriba
  ("para estúpidos"), sin agobiar con filtros.
- Ese embudo es lo que más se va a poder medir: si trae ventas y leads.
- Comunicación: mensaje corto estilo Trivago. "Decinos qué compu querés y cómo la querés
  pagar, y te encontramos la mejor opción". Las redes educan cómo usar el sitio. Anécdota de
  los padres del jardín que tardaron un mes buscando: ahí está el dolor.

### 2.4 La pata de las tiendas y la monetización (29:00–45:13)
- Pitch a una tienda: vidriera con tráfico, ahorrar pauta en Google/Meta, llegar a quien busca
  justo los modelos que tenés (muchas tiendas chicas tienen pocos modelos y necesitan
  exposición de esos).
- Idea de valor adicional: la tienda ve "dónde está parada" (qué tan lejos está de la mejor
  oferta). La mesa la discutió fuerte: "el rata no te va a pagar por saber que no vende".
- Conclusión: no se garantiza posición. Lo pago es un destacado rotulado. Lo que sí se puede
  prometer es acceso a las licitaciones corporativas sólo para suscriptas.
- Hay que trabajar muy fuerte lo corporativo y salir con un vendedor a las empresas:
  "te buscamos para tu empresa la notebook más barata". Huevo y gallina: para vender
  suscripciones hay que tener licitaciones posta.
- Comisión por licitación: se habló de 1 a 3% de la venta, "ni tan bajo ni tan alto",
  cuidando que la tienda no cierre por afuera con el comprador. Quedó sin definir.
- Otros ingresos futuros: banners a marcas cuando haya tráfico; AdSense en bloques chicos
  para el usuario final sólo cuando haya mucho tráfico.
- Los destacados van dentro del código del sitio, no AdSense, así los bloqueadores de
  anuncios no los tapan.
- Mercado Libre como contraejemplo: monetiza todo desde una posición monopólica y obliga a
  bajar precios; no es replicable y la gente dejó de usar los catálogos por eso.

### 2.5 Operativo e infraestructura (46:15–53:58)
- Prender el dominio notebooks.com.ar. El dominio está registrado a nombre de Tino; Fede
  tiene el acceso al NIC y puede delegar DNS.
- Crear Google Workspace (no un Gmail suelto, "si lo hacemos bien hay que hacerlo con
  Workspace") y los handles de redes sociales.
- "Sumá tu tienda" hoy manda un mail a Alejandro; al salir online hace falta un WhatsApp y un
  canal formal.
- Pomelli (Google) como herramienta para generar piezas de redes a partir de la marca; a
  evaluar, no es prioridad.
- Se mencionó Medusa para trackear referrals (el storefront de Córdoba Notebooks).

---

## 3. Plan de acción

### Fase 0 — Prender lo que ya existe (esta semana)
Objetivo: que el indexador ande en la URL real con datos de hoy. Sin esto no hay nada que
mostrar, medir ni comunicar.

| # | Acción | Responsable | Notas |
|---|--------|-------------|-------|
| 0.1 | Levantar la base y el deploy | Alejandro | Al 01-oct el sitio llevaba 22 días caído (Supabase NXDOMAIN, Vercel 500). Primero medir con `vigilar-sitio.mjs`, después mergear las ramas de paridad en el orden del runbook. |
| 0.2 | Delegar DNS de notebooks.com.ar y apuntar al deploy | Fede (acceso NIC) + Alejandro | Dominio registrado a nombre de Tino. |
| 0.3 | Rehacer el listado de modelos con todo el catálogo actual de Córdoba Notebooks | Alejandro + Fede/Tino (lista) | "Todas las que vendemos", no sólo algunas. |
| 0.4 | Volver a correr el cron diario (23:29) y verificar que actualiza ofertas | Alejandro | Puede correr en el agente de la otra compu. |
| 0.5 | Revisar qué tiendas permiten indexación y cuáles no | Alejandro | Incluir todas las no bloqueadas; pedir permiso o excluir a las que bloquean (Mauri Computación). Documentar la lista. |
| 0.6 | Limpiar semáforo y "verificados" | Alejandro | Deschequear verificados que no lo son; revisar que el semáforo refleje datos actuales. |

### Fase 1 — Experiencia del comprador (próximas 2 a 3 semanas)
Objetivo: "qué buscás + cómo la querés pagar", muy fácil y muy atractiva.

| # | Acción | Responsable |
|---|--------|-------------|
| 1.1 | Selector de forma de pago junto al buscador (contado / cuotas / mejor opción) que reordena resultados | Alejandro |
| 1.2 | Definir el cálculo de "mejor opción" (precio, cuotas, garantía, envío) y mostrarlo claro | Alejandro propone, mesa valida |
| 1.3 | Búsqueda tipo embudo/wizard con botones grandes (uso → pago → marca/procesador → garantía/envío) | Alejandro, con bocetos para validar en la próxima reunión |
| 1.4 | Bloque "Espacio patrocinado — tienda destacada del mes" en la home, en código propio (no AdSense), rotulado | Alejandro |
| 1.5 | Sumar al menos una tienda conocida más como destacada para que no sea sólo Córdoba Notebooks | Fede/Tino proponen candidatas |
| 1.6 | Instrumentar el embudo para medir clicks salientes y leads por paso | Alejandro |

### Fase 2 — Comunicación y marca (arranca ya, en paralelo)
| # | Acción | Responsable |
|---|--------|-------------|
| 2.1 | Crear Google Workspace para notebooks.com.ar | Quien quedó con dominio/Workspace/handles (confirmar: en la grabación dice "yo arranco con dominio, Workspace, handles") |
| 2.2 | Reservar handles de redes (Instagram, Facebook, TikTok, LinkedIn, X, YouTube) | ídem |
| 2.3 | Definir mensaje central estilo Trivago: "Decinos qué compu querés y cómo la querés pagar; te encontramos la mejor opción" | Mesa |
| 2.4 | Primeras piezas educativas de "cómo usar el sitio" (evaluar Pomelli) | Fede/Tino |
| 2.5 | Plan de pauta apuntada al resto del país, no a Córdoba | Mesa, después de Fase 0 |
| 2.6 | WhatsApp y canal formal para "Sumá tu tienda" (hoy va al mail de Alejandro) | Alejandro |

### Fase 3 — Tiendas y corporativo (después de tener tráfico)
| # | Acción | Responsable |
|---|--------|-------------|
| 3.1 | Definir propuesta de valor del vendedor premium: destacado, banner, acceso a licitaciones | Mesa |
| 3.2 | Definir tipos de suscripción y precio (fee fijo o por click; nunca por transacción) | Mesa |
| 3.3 | Definir comisión por licitación corporativa (se habló 1 a 3%) y cómo evitar que cierren por afuera | Mesa |
| 3.4 | Canal corporativo: landing + formulario de pedido por volumen que se reparte sólo a suscriptas | Alejandro (ya hay spec 08 y portal de tiendas implementado; falta correr migraciones 0009/0010) |
| 3.5 | Salir a vender a empresas (vendedor) | Fede/Tino |
| 3.6 | Informe de tráfico por tienda para mostrar a potenciales suscriptores | Alejandro, cuando haya datos |

---

## 4. Lista de tareas

Ordenada por prioridad. Las de código las puedo encarar yo; las marcadas **[mesa]** necesitan
una decisión de ustedes y las **[Fede/Tino]** son de ellos.

### Ahora
- [ ] Medir si el sitio y la base responden; si no, levantar Supabase y Vercel (0.1)
- [ ] Mergear las ramas de paridad pendientes a `main` en el orden del runbook (0.1)
- [ ] **[Fede]** Delegar DNS de notebooks.com.ar al deploy (0.2)
- [ ] **[Fede/Tino]** Pasar la lista completa de modelos que vende hoy Córdoba Notebooks (0.3)
- [ ] Rehacer el catálogo de modelos con esa lista y correr la ingesta (0.3)
- [ ] Reactivar el cron diario de 23:29 y verificar que actualice ofertas (0.4)
- [ ] Auditar qué tiendas permiten indexación (robots, ToS) y armar la lista de incluidas / excluidas / a pedir permiso (0.5)
- [ ] Deschequear "verificados" que no corresponden y revisar el semáforo (0.6)
- [ ] Crear Google Workspace y handles de redes (2.1, 2.2) — confirmar quién lo toma
- [ ] Redirigir "Sumá tu tienda" a un canal compartido + WhatsApp (2.6)

### Próximas dos semanas
- [ ] Selector de forma de pago al lado del buscador, que reordena (1.1)
- [ ] **[mesa]** Validar la fórmula de "mejor opción" (1.2)
- [ ] Bocetos del buscador tipo embudo para la reunión del 27-oct (1.3)
- [ ] Bloque "Espacio patrocinado / tienda destacada del mes" en la home, con Córdoba Notebooks (1.4)
- [ ] **[Fede/Tino]** Proponer una segunda tienda destacada creíble (1.5)
- [ ] Medición del embudo: clicks salientes y leads por paso (1.6)
- [ ] **[mesa]** Cerrar el mensaje central y el tono de comunicación (2.3)
- [ ] **[Fede/Tino]** Primeras piezas de redes, probar Pomelli (2.4)

### Cuando haya tráfico
- [ ] **[mesa]** Propuesta de valor y planes de suscripción para tiendas (3.1, 3.2)
- [ ] **[mesa]** Comisión por licitación corporativa y reglas (3.3)
- [ ] Correr migraciones 0009/0010 y activar el canal corporativo para suscriptas (3.4)
- [ ] **[Fede/Tino]** Vendedor para empresas (3.5)
- [ ] Informe de tráfico por tienda (3.6)
- [ ] **[mesa]** Plan de pauta fuera de Córdoba (2.5)

### Decisiones abiertas para el 27-oct
- Quién crea Workspace y handles (en la grabación no queda claro quién dijo "yo arranco").
- Precio y tipo de suscripción para tiendas.
- Porcentaje de comisión corporativa.
- Qué tiendas entran como "creíbles" en la primera camada y cuál es la segunda destacada.
- Nombre de la "mejor opción": cómo se explica en un botón.

---

## 5. Cruce con lo que ya está en el repo

- **El sitio está caído.** La reunión asume que "hay que prenderlo"; según el estado al
  01-oct llevaba 22 días caído y `main` sigue en el merge del 24-ago con cuatro ramas de
  paridad sin mergear. Eso es la tarea 0.1 y bloquea todo lo demás.
- **Lo corporativo ya tiene spec e implementación** (`specs/08-venta-corporativa.md`: landing
  `/corporativo`, RFQ, portal de tiendas con cotizaciones). Falta correr migraciones 0009 y
  0010 y configurar Auth. La idea de la reunión (sólo suscriptas ven licitaciones) es un
  filtro sobre lo que ya existe.
- **El destacado pago rotulado ya está especificado** en `specs/10-monetizacion-fase1-destacados.md`
  y coincide con lo decidido: ranking siempre por precio, lo pago en slot aparte.
- **Reputación y perfil de tiendas** (`specs/04`) ya existen y sirven para los "verificados".
- **Lo nuevo que no está en ningún spec:** el selector de forma de pago junto al buscador, la
  búsqueda tipo embudo/wizard y el cálculo de "mejor opción" por forma de pago. Conviene
  escribir un spec 12 antes de codear.
- **Alertas de precio y mails** siguen pendientes de un worker de emails (BACKLOG).
