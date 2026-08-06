/**
 * Seed de reseñas del blog (spec 01).
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scrapers/seed-blog.mjs
 *
 * Inserta/actualiza 5 artículos tipo "review" (kind='review', status='published')
 * y los relaciona con su modelo (post_models). La portada se toma de la imagen del
 * modelo. Idempotente: re-ejecutar actualiza (upsert por id), preservando published_at.
 *
 * Son análisis editoriales basados en las specs y el posicionamiento de mercado
 * (no pruebas de laboratorio); no incluyen precios en el cuerpo (el precio en vivo lo
 * muestra el bloque "Modelos mencionados" de cada ficha).
 */
import { createClient } from "@supabase/supabase-js";
import { requireServiceRole } from "./lib.mjs";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = requireServiceRole();
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const now = () => new Date().toISOString();

const REVIEWS = [
  {
    modelId: "lenovo-ideapad-slim-3-15irh8-16-512",
    slug: "review-lenovo-ideapad-slim-3-15irh8",
    title: "Lenovo IdeaPad Slim 3 15IRH8: la notebook de uso diario que casi nunca se equivoca",
    excerpt:
      "Con Core i5 de 13ª gen, 16 GB de RAM y SSD de 512 GB, la IdeaPad Slim 3 es una de las opciones más equilibradas para estudiar y trabajar sin gastar de más.",
    body: `## Para quién es
La **Lenovo IdeaPad Slim 3 15IRH8** apunta al público más amplio: estudiantes, oficina y multitarea diaria. No es una máquina de nicho, y ahí está su gracia — hace bien casi todo lo que la mayoría necesita.

## Rendimiento
El **Core i5-13420H** con **16 GB de RAM** es el punto justo para 2026: navegás con decenas de pestañas, Office, videollamadas y edición liviana sin que se note el esfuerzo. Los 16 GB (y no 8) son la diferencia clave frente a modelos más baratos: menos swapping, más años de vida útil. El **SSD de 512 GB** alcanza para el sistema y una biblioteca sana de archivos.

## Pantalla y construcción
Pantalla de **15,6" IPS Full HD**: buena para trabajar cómodo, con ángulos de visión decentes. No esperes brillo de exterior ni colores calibrados para diseño, pero para estudio y oficina cumple de sobra. El chasis es sobrio y liviano para su categoría.

## Lo que no
GPU integrada: no es para juegos exigentes ni render 3D pesado. Si buscás gaming, mirá otra categoría.

## Veredicto
Si querés **una sola compra que te dure y no te haga pensar**, la IdeaPad Slim 3 es de las apuestas más seguras del mercado. Compará abajo el precio entre tiendas: suele aparecer en ofertas que la vuelven imbatible en su rango.`,
  },
  {
    modelId: "acer-aspire-5-a515-r7-16-512",
    slug: "review-acer-aspire-5-a515-45-ryzen-7",
    title: "Acer Aspire 5 (Ryzen 7 5700U): probablemente el mejor precio/rendimiento del catálogo",
    excerpt:
      "Ocho núcleos Ryzen, 16 GB de RAM y SSD de 512 GB por un precio que suele estar debajo del millón. Para productividad, es difícil de superar.",
    body: `## Para quién es
El **Acer Aspire 5 A515-45** es la recomendación clásica para quien quiere **el máximo rendimiento por peso**: productividad, programación liviana y multitarea sin pagar de más.

## Rendimiento
El **Ryzen 7 5700U** trae **8 núcleos / 16 hilos**, algo poco habitual en esta franja de precio. Para compilar proyectos chicos, correr máquinas virtuales livianas, planillas pesadas o muchas apps a la vez, rinde por encima de lo que su precio sugiere. Con **16 GB de RAM** y **SSD de 512 GB**, el conjunto queda parejo y sin cuellos de botella para uso general.

## Pantalla y construcción
**15,6" IPS Full HD**, correcta para trabajar. El equipo es algo más pesado (~1,76 kg) y de plástico, pero es el compromiso esperable a este precio.

## Lo que no
Gráficos integrados Radeon: alcanza para video y algún juego viejo, no para gaming moderno. La autonomía es correcta, no sobresaliente.

## Veredicto
Si tu prioridad es **rendimiento de CPU por peso**, es de las mejores compras del mercado argentino. Mirá el comparador: cuando entra en oferta, es casi imbatible.`,
  },
  {
    modelId: "apple-macbook-air-13-m3-8-256",
    slug: "review-apple-macbook-air-13-m3",
    title: "MacBook Air M3: la ultraportátil silenciosa que dura todo el día",
    excerpt:
      "Chip Apple M3, 1,24 kg, sin ventilador y con una autonomía que humilla a casi todo Windows. Premium, pero con motivos.",
    body: `## Para quién es
El **MacBook Air 13 M3** es para quien valora **portabilidad, silencio y batería** por encima de todo, y vive cómodo en macOS. Ideal para escritura, programación, oficina y diseño en movimiento.

## Rendimiento
El **chip M3** es rapidísimo en tareas cotidianas y sostiene cargas de trabajo profesionales (edición de fotos, código, muchas apps) **sin ventilador** — es decir, en absoluto silencio y sin calentarse. La eficiencia del chip es la verdadera estrella: **autonomía de jornada completa** real.

## Pantalla y construcción
La **Liquid Retina de 13,6"** es de las mejores de su tamaño: brillo alto, colores muy buenos, ideal para trabajo visual. El chasis de aluminio a **1,24 kg** es referencia en construcción.

## Lo que no
La versión base trae **8 GB de RAM y 256 GB de SSD**: suficiente para la mayoría, pero justo si trabajás con muchos proyectos pesados o querés guardar todo local. Y macOS no es para todos (ojo con software Windows-only).

## Veredicto
Es caro, pero **entrega exactamente lo que promete**: la mejor experiencia ultraportátil del mercado. Si el presupuesto da y no dependés de Windows, es una compra que se disfruta años.`,
  },
  {
    modelId: "lenovo-legion-5-15irx9-rtx5070",
    slug: "review-lenovo-legion-5-15irx9",
    title: "Lenovo Legion 5 15IRX9: potencia de escritorio en formato notebook",
    excerpt:
      "Core i9, GeForce RTX 5070 y pantalla OLED. Una bestia para gaming y creación de contenido que no pide permiso.",
    body: `## Para quién es
La **Legion 5 15IRX9** es para **gamers exigentes y creadores** que necesitan una GPU seria y no quieren un equipo de escritorio. Es de las más potentes del catálogo.

## Rendimiento
El **Core i9-14900HX** es un procesador de altísimo rendimiento, y la **GeForce RTX 5070** mueve juegos actuales en alto/ultra y acelera render, edición de video y cargas con IA. Con **16 GB de RAM** y **SSD de 1 TB**, tenés margen para juegos pesados y proyectos grandes (la RAM es lo primero que quizás quieras ampliar a futuro).

## Pantalla y construcción
La joya es la **pantalla OLED**: negros perfectos, color vibrante y respuesta rápida — un lujo para jugar y para trabajar con color. Es un equipo grande y pesado (~2,3 kg), con la refrigeración que semejante hardware necesita.

## Lo que no
Autonomía corta (es lo normal en esta categoría) y hay que bancarse el peso y el ruido de los ventiladores bajo carga. No es una notebook para llevar liviano.

## Veredicto
Si querés **máximo rendimiento gráfico** y una pantalla OLED que enamora, la Legion 5 es una compra de las que no se quedan cortas. Comparala abajo entre tiendas antes de decidir.`,
  },
  {
    modelId: "asus-tuf-a15-r7-16-512-rtx4060",
    slug: "review-asus-tuf-gaming-a15-fa507",
    title: "Asus TUF Gaming A15: el punto de entrada serio al gaming en notebook",
    excerpt:
      "Ryzen 7, GeForce RTX 4060 y chasis con certificación militar. Gaming 1080p sin drama, a un precio mucho más sensato que el tope de gama.",
    body: `## Para quién es
La **TUF Gaming A15 FA507** es para quien quiere **entrar al gaming en notebook sin ir al tope de gama**: juega todo en 1080p y además sirve para edición y trabajo pesado.

## Rendimiento
El **Ryzen 7 7735HS** más la **GeForce RTX 4060** son una dupla muy equilibrada: juegos actuales en alto a 1080p con buena tasa de cuadros, y potencia de sobra para edición de video, streaming y tareas creativas. **16 GB de RAM** y **SSD de 512 GB** completan un conjunto sólido para su precio.

## Pantalla y construcción
Pantalla **15,6" IPS Full HD** pensada para gaming (fluida). La serie TUF apuesta a la **durabilidad** (certificación de resistencia tipo militar): es robusta antes que fina. Pesa ~2,2 kg.

## Lo que no
Estética y peso "de gamer", autonomía moderada y ventiladores audibles bajo carga. La pantalla es buena para jugar, no un panel calibrado para color profesional.

## Veredicto
Es de las mejores puertas de entrada al gaming serio en Argentina: **mucho rendimiento por lo que cuesta**. Si la RTX 4060 te alcanza (y a 1080p sobra), es una compra muy inteligente.`,
  },
];

async function main() {
  for (const r of REVIEWS) {
    const { data: model, error: mErr } = await sb
      .from("models")
      .select("id,image_url")
      .eq("id", r.modelId)
      .maybeSingle();
    if (mErr) throw new Error(mErr.message);
    if (!model) {
      console.warn(`· modelo no encontrado, salteo: ${r.modelId}`);
      continue;
    }

    // Preservar published_at si ya existía
    const { data: existing } = await sb.from("posts").select("published_at").eq("id", r.slug).maybeSingle();
    const publishedAt = existing?.published_at ?? now();

    const { error: pErr } = await sb.from("posts").upsert(
      {
        id: r.slug,
        slug: r.slug,
        title: r.title,
        excerpt: r.excerpt,
        cover_image: model.image_url ?? null,
        body_md: r.body,
        kind: "review",
        author: "Redacción",
        status: "published",
        published_at: publishedAt,
        updated_at: now(),
      },
      { onConflict: "id" }
    );
    if (pErr) throw new Error(`post ${r.slug}: ${pErr.message}`);

    await sb.from("post_models").delete().eq("post_id", r.slug);
    const { error: pmErr } = await sb.from("post_models").insert({ post_id: r.slug, model_id: r.modelId });
    if (pmErr) throw new Error(`post_models ${r.slug}: ${pmErr.message}`);

    console.log(`✓ ${r.slug}`);
  }
  console.log(`\nListo: ${REVIEWS.length} reseñas publicadas.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
