# Monetización de las dos puntas — comprador y tienda

Investigación de benchmark (comparadores/marketplaces del mundo) + recomendación priorizada para
**Notebooks.com.ar**. Basado en investigación web (datos 2023–2026). Complementa
[03-modelos-de-negocio.md](03-modelos-de-negocio.md). Última actualización: 2026-07-30.

> **Advertencia de exactitud:** varios precios/comisiones provienen de fuentes secundarias (blogs,
> reviews), no de tarifarios oficiales, y varían por país/categoría/fecha. Están marcados con *(~)* o
> *"no confirmado"*. Validar antes de tomar decisiones con números finos.

---

## TL;DR (la conclusión primero)

1. **Casi nadie le cobra al comprador.** En ~13 portales analizados, el usuario final compara **gratis**;
   el ingreso viene del **lado tienda/marca**. La única excepción que funciona es **Keepa** (suscripción
   de datos pro, €19/mes) — y apunta a *power users/revendedores*, no al comprador casual.
2. **Para nosotros la punta compradora es adquisición de tráfico, no ingreso directo.** En Argentina la
   disposición a pagar del consumidor por un comparador es ~nula (Pricely vive de donaciones; Precios
   Claros es estatal).
3. **La plata está en la punta tienda**, en este orden de madurez: **afiliación/CPC → destacados
   pagos (bien etiquetados) → SaaS de inteligencia de precios + leads corporativos → retail media/ads**
   (esto último recién con volumen).
4. **Regla de oro innegociable:** el ranking se ordena **siempre por precio**; lo pago va en un slot
   **separado y rotulado "Patrocinado"** (modelo Trivago). Es nuestro diferencial de confianza.

---

## 1. Contexto y objetivo

Hoy el único modelo es **afiliación por click-out** (CPC/CPA), con UTMs en pocas tiendas y `click_outs`
persistidos. La pregunta: **¿cómo sumar ingresos en ambas puntas sin romper la neutralidad** ("orden
siempre por precio") que es la razón por la que la gente confía en el sitio?

Activos que ya tenemos y que habilitan monetización (no partimos de cero):
- **Historial de precios** por modelo (dato propio, defendible → base de un producto de datos).
- **Reputación/perfil de tiendas** (spec 04) → base para tiers "Verificada+".
- **RFQ corporativo + portal de tiendas** (spec 08) → leads B2B monetizables.
- **`model_notify`** (spec 06) → señal de demanda por modelo (producto de datos para tiendas).
- **`click_outs`** → medición de tráfico entregado a cada tienda (base para cobrar CPC/CPA).

---

## 2. Benchmark — cómo monetiza cada portal

| Portal | Tipo | Quién paga | Modelo principal | Ranking | Precio aprox. |
|---|---|---|---|---|---|
| **Idealo** (DE) | Comparador | Tienda / marcas | **CPC** + retail media + checkout propio | Por **precio** (CPC = tarifa de entrada) | CPC ~€0,51 (rango €0,30–0,80); mín. ~€20/mes |
| **Google Shopping** | Comparador/ads | Tienda | **CPC (subasta)** + free listings | **Mixto** (puja+relevancia+precio) | Subasta; free listings gratis |
| **PriceRunner** (Klarna) | Comparador | Tienda | **CPC** freemium (listado gratis, tráfico premium pago) | Por precio + tráfico priorizado pago | No público |
| **Kelkoo** | Comparador/red | Tienda | **CPC** + arbitraje de tráfico (revende clics) | CPC + calidad feed | No público ("hablemos") |
| **Connexity/Shopzilla** | Red CPC | Tienda paga / publisher cobra | **CPC** (alimenta Bing Shopping) | Feed + puja | No público |
| **Geizhals/Skinflint** (DE/AT, tech) | Comparador tech | Tienda | **CPC** | Por **precio** (nicho specs) | ~€0,32/clic con logo, ~€0,35 sin *(2ª fuente)* |
| **Trivago** (hoteles) | Metabuscador | Advertisers | **CPC subasta** (~95%) + CPA + suscripción | **Subasta que pondera precio/relevancia** (no gana siempre el que más paga) | CPC €0,50–5,00 |
| **Mercado Libre** (AR/BR) | Marketplace | Vendedor | Comisión **+ retail media (Mercado Ads)** + envíos + cuotas | Orgánico (precio/reputación/Full) + **Product/Brand Ads "Patrocinado"** | Comisión ~11,5–17,5% AR *(2ª fuente)*; Ads CPC subasta |
| **Buscapé / Zoom** (BR) | Comparador | Tienda | **CPC (subasta)** + afiliación (Lomadee) + cashback | Precio + **posición por puja CPC** | Zoom: inversión mín. R$200 |
| **PCPartPicker** | Vertical tech | Retailer (afiliados) | **Afiliación pura (CPA)** — sin tier pago | Por precio | — (usuario gratis) |
| **Camelcamelcamel** | Historial precios | Amazon/anunciantes | **Afiliación + ads** | — | — (usuario gratis) |
| **Keepa** ⭐ | Historial precios | **El usuario** + B2B API | **Suscripción de datos (freemium)** | — | **€19/mes** consumidor; API €49–4.499/mes |
| **Trustpilot** | Reputación (SaaS) | Comercio | **SaaS freemium por suscripción** | — | ~US$259 → 1.059/mes (Enterprise custom) |
| **Capterra** / **G2** | Directorio B2B | Vendor | **Pay-per-click/lead** (Capterra) vs **suscripción + buyer intent** (G2) | Perfiles patrocinados | Capterra: mín. ~US$2/clic, ~US$500/mes. G2: desde ~US$2.999/año |

---

## 3. Patrones transversales (lo que se repite en todo el mundo)

1. **Paga la tienda, no el comprador.** Universal. El comparador gratis para el usuario es la norma;
   cobrarle al usuario solo funciona con **datos pro** (Keepa) para un segmento profesional.
2. **CPC > CPA como estándar del comparador.** El comparador no controla la conversión en la tienda,
   así que cobra por **clic entregado** (alineado a lo que sí controla: el tráfico). La afiliación/CPA
   aparece como complemento o en verticales muy afiliados (PCPartPicker, Camel).
3. **Dos escuelas de ranking.** (a) *Clásico por precio* (Idealo, Geizhals, PriceRunner): el CPC es
   tarifa de entrada, no compra posición. (b) *Subasta híbrida* (Google, Trivago, MELI, Buscapé/Zoom):
   la puja influye la posición **pero ponderada por precio/relevancia** para no romper la experiencia.
4. **Freemium en el listado.** Listar gratis e ilimitado (maximiza cobertura de catálogo, requisito
   para ser creíble) y cobrar el **tráfico/visibilidad/herramientas**. Idealo, PriceRunner, Trustpilot.
5. **La reputación es palanca comercial, no solo confianza.** Los tiers de MELI (Verde→Platinum) atan
   calidad de servicio a **mejor posición + beneficios**. Replicable con nuestra "tienda Verificada".
6. **Capas nuevas encima del CPC: retail media y datos.** Idealo vende espacios a marcas; MELI hace
   >US$1B en ads (>50% del retail media de LatAm); Klarna monetiza la data de PriceRunner (US$180M en
   ads 2024). El futuro rentable es **publicidad apalancada en first-party data + producto de datos**.
7. **Todo depende del volumen de tráfico — y varios lo compran (arbitraje).** Kelkoo y Trivago compran
   clics y los revenden; márgenes frágiles. **Sin tráfico orgánico propio (SEO, marca, contenido) el
   CPC es caro y débil.** En AR/BR la intención se concentra en MELI + Google.

---

## 4. Palancas por punta (evaluación para Notebooks.com.ar)

### Punta COMPRADOR (= tráfico; ingreso directo marginal en AR)
| Palanca | Veredicto | Notas |
|---|---|---|
| Afiliación / CPC click-out | ✅ **Base** | Ya lo tenemos parcialmente; bajo rozamiento, no molesta al usuario. |
| Suscripción "pro" tipo Keepa | 🟡 Nicho / futuro | Historial completo, historial de stock, alertas avanzadas, sin ads. Solo lo paga un revendedor/comprador intensivo. Baja prioridad; validar demanda. |
| Ads / display | 🟡 Con volumen | Molesta y rinde poco sin mucho tráfico. Evitar al inicio (daña confianza). |
| Contenido patrocinado (blog) | 🟢 Sí, con cuidado | Reseñas/guías patrocinadas **claramente rotuladas**. Ya tenemos blog (spec 01). |
| Producto de datos al consumidor | ❌ No | No hay mercado. |

### Punta TIENDA (= donde está el ingreso)
| Palanca | Veredicto | Notas |
|---|---|---|
| Listado gratis (cobertura) | ✅ **Mantener gratis** | Requisito para ser comparador creíble; es el gancho. |
| **CPC / pago por click-out** | ✅ **Primer ingreso escalable** | Cobrar el tráfico de alta intención que ya entregamos (`click_outs`). Pay-per-result = fácil de vender en AR (paga por resultado, no fee fijo). |
| **Destacado / "Verificada+" (Patrocinado)** | ✅ **Quick win** | Slot patrocinado **separado del ranking por precio** y rotulado. Perfil enriquecido, badge, prioridad en el slot pago. Modelo Trivago/MELI. |
| **SaaS de inteligencia de precios** | ✅ **Alto valor / moat** | Dashboard para la tienda: dónde está cara/barata vs. el mercado, evolución, share of "mejor precio". Usa nuestro **historial** (dato propio). Suscripción mensual. |
| **Leads corporativos (RFQ)** | ✅ **Encaja con spec 08** | Fee por lead o comisión por RFQ cerrado. Pay-per-lead (modelo Capterra) es lo más vendible. |
| **Señal de demanda (`model_notify`)** | 🟢 Complemento | "N personas esperan este modelo" como dato/alerta para la tienda. |
| Retail media / ads de marcas | 🟡 Con volumen | Vender espacios a Lenovo/HP/etc. Recién con tráfico relevante (fase tardía). |
| Onboarding/integración pago | ❌ Evitar | Rozamiento alto para sumar catálogo; mejor que integrarse sea gratis. |

---

## 5. Recomendación priorizada (por fases)

**Principio rector:** el ranking se ordena **por precio, siempre**. Todo lo pago es un **slot separado
y rotulado "Patrocinado"**. Nunca se vende una mejor posición dentro de la lista ordenada por precio.

- **Fase 0 — Consolidar la base de afiliación (ya).** Cerrar programas de afiliados/CPC reales con las
  tiendas top y usar `click_outs` para reportarles el tráfico entregado. *Métrica: % de click-outs
  monetizados, ingreso por click-out.*
- **Fase 1 — Destacados pagos para tiendas (quick win, bajo riesgo).** Slot "Patrocinado" separado +
  perfil enriquecido + badge "Verificada+" (encima de spec 04). Cobrar **CPC** (pago por resultado) más
  que fee fijo. *Métrica: tiendas activas pagando, ingreso/tienda, CTR del slot.*
- **Fase 2 — Producto de datos para tiendas (moat).** SaaS de inteligencia competitiva de precios sobre
  nuestro historial + leads del RFQ corporativo (spec 08) con **fee por lead**. Es lo más defendible y
  lo que mejor aprovecha nuestro dato propio. *Métrica: suscriptores, retención, ingreso por lead.*
- **Fase 3 — Comprador pro (opcional, nicho).** Suscripción tipo Keepa (historial/alertas avanzadas,
  sin ads) para revendedores/power users. Solo si aparece demanda clara. *Métrica: conversión free→pro.*
- **Fase 4 — Retail media / ads (dependiente de escala).** Espacios a marcas + contenido patrocinado en
  el blog, cuando el tráfico lo justifique. *Métrica: eCPM, ingreso publicitario / GMV.*

**Orden de ataque sugerido:** Fase 1 y la base de Fase 0 en paralelo (ingreso rápido, bajo esfuerzo);
Fase 2 como apuesta de mediano plazo (diferencial); Fases 3–4 supeditadas a volumen.

---

## 6. Riesgos y cuidados

- **Neutralidad del ranking = activo #1.** Si el usuario percibe que el orden se compra, se pierde el
  tráfico que hace valer todo lo demás. Etiquetar SIEMPRE lo patrocinado (norma global).
- **Dependencia de tráfico.** Todo el modelo tienda escala con visitas. Priorizar SEO, marca y
  contenido; **no** caer en arbitraje de tráfico caro (lección Kelkoo/Trivago).
- **Concentración en MELI + Google en AR/BR:** la intención de compra está concentrada; el diferencial
  es la **neutralidad + historial real + nicho notebooks**, no competir en volumen bruto.
- **Privacidad en productos de datos:** el SaaS de precios usa datos públicos de oferta; los leads
  corporativos y `model_notify` implican datos de contacto → tratar con cuidado (ver `/privacidad`).

---

## 7. Fuentes (selección)

- **Idealo:** solutions.idealo.com (costs & conditions); Priceva.
- **Google Shopping/CSS/DMA:** SavvyRevenue, Incubeta, Google Merchant Center Help.
- **PriceRunner/Klarna:** klarna.com/press, Wikipedia, ppc.land (ads 2024), Dealroom.
- **Kelkoo/Connexity:** kelkoogroup.com, comparisonshoppingpartners.withgoogle.com, DataFeedWatch, Sovrn.
- **Geizhals/Skinflint:** Grokipedia, Mulwi *(pricing vía 2ª fuente — verificar oficial)*.
- **Trivago:** productmint, FourWeekMBA.
- **Mercado Libre / Mercado Ads:** Statista, eMarketer, MELI Investor Relations Q4'24/Q1'25; comisiones
  AR vía Rapiboy/Base/iProfesional *(2ª fuente — validar en el simulador oficial)*; Nubimetrics (tiers).
- **Buscapé/Zoom:** zoom.com.br/corp/anuncie, Wikipedia (Mosaico/Banco PAN), Lomadee.
- **PCPartPicker:** pcpartpicker.com/disclosure. **Camelcamelcamel:** camelcamelcamel.com/about.
- **Keepa:** jordiob.com, AMZScout, fbamultitool, SaaSworthy *(keepa.com bloquea fetch; precios vía
  reviews consistentes)*.
- **Trustpilot:** SocialPilot, WiserReview, Capterra. **Capterra/G2:** Capterra PPC Service Description,
  Gartner Digital Markets, G2 Pricing Guide FY26, Vendr.
- **AR:** precialo.com.ar *(modelo inferido, no publicado)*, preciosclaros.gob.ar, pricely.ar.

### Datos con menor certeza (revisar antes de decidir)
- Comisiones exactas de MELI y Mercado Shops (varían por categoría/provincia; fuentes de terceros).
- Pricing de Keepa (reviews de terceros, keepa.com bloquea el bot).
- Tarifas de Geizhals y Kelkoo/Connexity (no públicas o vía 2ª fuente).
- Estado operativo de PriceRunner (standalone vs. integrado en app Klarna — fuentes contradictorias).
- Modelo de ingreso de Precialo (inferido; no publican tarifario).
