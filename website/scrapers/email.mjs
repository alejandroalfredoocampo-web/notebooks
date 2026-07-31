/**
 * Envío de emails transaccionales vía Resend (https://resend.com).
 *   Env: RESEND_API_KEY, EMAIL_FROM (ej. "Notebooks.com.ar <avisos@notebooks.com.ar>").
 * Si no hay RESEND_API_KEY, corre en DRY-RUN: loguea lo que enviaría y NO envía
 * (el worker, al ver skipped, tampoco marca como notificado → nada se pierde).
 */
const { RESEND_API_KEY, EMAIL_FROM } = process.env;
const FROM = EMAIL_FROM || "Notebooks.com.ar <onboarding@resend.dev>";

export const emailConfigured = Boolean(RESEND_API_KEY);

export async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    console.log(`  · [dry-run] email a ${to}: "${subject}" (falta RESEND_API_KEY, no se envía)`);
    return { skipped: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error(`  · error Resend (${res.status}) a ${to}: ${t.slice(0, 200)}`);
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error(`  · fallo enviando a ${to}: ${e.message}`);
    return { ok: false };
  }
}

const BASE = "https://www.notebooks.com.ar";

/** Layout HTML mínimo y sobrio, con pie + link de baja opcional. */
export function layout({ title, body, unsubscribeUrl }) {
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="font-weight:800;font-size:18px;margin-bottom:16px">notebooks<span style="color:#336EFA">.com.ar</span></div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px">
      <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
      ${body}
    </div>
    <p style="font-size:12px;color:#94a3b8;margin-top:16px;line-height:1.6">
      Te escribimos desde <a href="${BASE}" style="color:#64748b">Notebooks.com.ar</a>, el comparador de precios de notebooks de Argentina.
      ${unsubscribeUrl ? `<br>Si no querés recibir más este aviso, <a href="${unsubscribeUrl}" style="color:#64748b">date de baja acá</a>.` : ""}
    </p>
  </div></body></html>`;
}

export { BASE };
