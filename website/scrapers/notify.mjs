/**
 * Worker de emails (loop de retención).
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... [RESEND_API_KEY=...] node scrapers/notify.mjs
 *
 * Procesa dos loops sobre datos ya capturados:
 *   1. Alertas de precio (price_alerts): avisa cuando el mejor precio de un modelo
 *      baja por debajo del target (o de la última baja avisada).
 *   2. Avisos de disponibilidad (model_notify): avisa cuando un modelo que no tenía
 *      ofertas consigue su primera publicación.
 *
 * Sin RESEND_API_KEY corre en DRY-RUN: loguea sin enviar y NO marca como notificado
 * (así, cuando se configure el envío, nada quedó perdido).
 */
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, layout, emailConfigured, BASE } from "./email.mjs";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const fmtARS = (n) => "$" + Math.round(n).toLocaleString("es-AR");
const now = () => new Date().toISOString();

/** Token de baja: HMAC del id con la service_role como secreto (el mismo cálculo en /baja). */
export function unsubToken(id) {
  return crypto.createHmac("sha256", SUPABASE_SERVICE_ROLE_KEY).update(`alert:${id}`).digest("hex").slice(0, 16);
}

async function loadContext() {
  const [modelsR, listingsR] = await Promise.all([
    sb.from("models").select("id,brand,name,slug,brand_slug"),
    sb.from("listings").select("model_id,price_cash,in_stock").eq("match_status", "confirmed"),
  ]);
  if (modelsR.error) throw new Error(modelsR.error.message);
  if (listingsR.error) throw new Error(listingsR.error.message);

  const models = new Map(modelsR.data.map((m) => [m.id, m]));
  // Mejor precio por modelo: mínimo entre las con stock; si ninguna, mínimo general.
  const inStock = new Map();
  const all = new Map();
  for (const l of listingsR.data) {
    if (!l.model_id || l.price_cash == null) continue;
    const p = Number(l.price_cash);
    all.set(l.model_id, Math.min(all.get(l.model_id) ?? Infinity, p));
    if (l.in_stock !== false) inStock.set(l.model_id, Math.min(inStock.get(l.model_id) ?? Infinity, p));
  }
  const bestPrice = new Map();
  for (const id of new Set([...all.keys()])) bestPrice.set(id, inStock.get(id) ?? all.get(id));
  return { models, bestPrice };
}

async function runPriceAlerts({ models, bestPrice }) {
  const { data: alerts, error } = await sb.from("price_alerts").select("*").eq("active", true);
  if (error) throw new Error(error.message);
  let sent = 0,
    baselined = 0;

  for (const a of alerts ?? []) {
    const model = models.get(a.model_id);
    const best = bestPrice.get(a.model_id);
    if (!model || best == null) continue;

    const target = a.target_price ?? null;
    const lastP = a.last_notified_price ?? null;

    let notify = false;
    if (target != null) {
      notify = best <= target && (lastP == null || best < lastP);
    } else if (lastP == null) {
      // "cualquier baja": primera evaluación → fijar baseline sin enviar
      await sb.from("price_alerts").update({ last_notified_price: best }).eq("id", a.id);
      baselined++;
      continue;
    } else {
      notify = best < lastP;
    }
    if (!notify) continue;

    const url = `${BASE}/notebooks/${model.brand_slug}/${model.slug}`;
    const unsub = `${BASE}/baja?id=${a.id}&t=${unsubToken(a.id)}`;
    const r = await sendEmail({
      to: a.email,
      subject: `📉 Bajó de precio: ${model.brand} ${model.name}`,
      html: layout({
        title: `${model.brand} ${model.name} bajó de precio`,
        body: `<p style="font-size:16px">Ahora desde <b>${fmtARS(best)}</b>${
          target != null ? ` (tu objetivo era ${fmtARS(target)})` : lastP != null ? ` (antes ${fmtARS(lastP)})` : ""
        }.</p>
        <p><a href="${url}" style="display:inline-block;background:#336EFA;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:700">Ver ofertas</a></p>`,
        unsubscribeUrl: unsub,
      }),
    });
    if (r.skipped || r.ok) {
      if (!r.skipped) {
        await sb.from("price_alerts").update({ last_notified_at: now(), last_notified_price: best }).eq("id", a.id);
        sent++;
      }
    }
  }
  return { sent, baselined, total: (alerts ?? []).length };
}

async function runAvailability({ models, bestPrice }) {
  const { data: rows, error } = await sb.from("model_notify").select("*").is("notified_at", null);
  if (error) throw new Error(error.message);
  let sent = 0;

  for (const n of rows ?? []) {
    const model = models.get(n.model_id);
    const best = bestPrice.get(n.model_id);
    if (!model || best == null) continue; // todavía sin ofertas

    const url = `${BASE}/notebooks/${model.brand_slug}/${model.slug}`;
    const r = await sendEmail({
      to: n.email,
      subject: `✅ Ya está disponible: ${model.brand} ${model.name}`,
      html: layout({
        title: `${model.brand} ${model.name} ya se consigue`,
        body: `<p style="font-size:16px">Una tienda lo publicó, desde <b>${fmtARS(best)}</b>.</p>
        <p><a href="${url}" style="display:inline-block;background:#336EFA;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:700">Ver ofertas</a></p>`,
      }),
    });
    if (r.ok) {
      await sb.from("model_notify").update({ notified_at: now() }).eq("id", n.id);
      sent++;
    }
  }
  return { sent, total: (rows ?? []).length };
}

async function main() {
  console.log(`Worker de emails — ${emailConfigured ? "envío ACTIVO (Resend)" : "DRY-RUN (sin RESEND_API_KEY)"}`);
  const ctx = await loadContext();
  const pa = await runPriceAlerts(ctx);
  const av = await runAvailability(ctx);
  console.log(`Alertas de precio: ${pa.sent} enviadas, ${pa.baselined} baseline, de ${pa.total} activas.`);
  console.log(`Avisos de disponibilidad: ${av.sent} enviados, de ${av.total} pendientes.`);
  if (!emailConfigured) console.log("Nada se marcó como notificado (dry-run). Configurá RESEND_API_KEY para enviar.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
