"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Member = { userId: string; email: string; storeId: string; storeName: string };
type StoreOpt = { id: string; name: string };

export default function StoreMemberManager({
  members,
  stores,
}: {
  members: Member[];
  stores: StoreOpt[];
}) {
  const router = useRouter();
  const [storeId, setStoreId] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function link(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    const res = await fetch("/api/admin/store-member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, storeId }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setOk(`Vinculado ${email}`);
      setEmail("");
      router.refresh();
    } else setError(j.error || "No se pudo vincular");
  }

  async function unlink(m: Member) {
    if (!confirm(`¿Desvincular ${m.email} de ${m.storeName}?`)) return;
    await fetch("/api/admin/store-member", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: m.userId, storeId: m.storeId }),
    });
    router.refresh();
  }

  const field = "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue";

  return (
    <div>
      <form onSubmit={link} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-[12px] font-bold">Tienda</label>
          <select className={field} value={storeId} onChange={(e) => setStoreId(e.target.value)} required>
            <option value="">Elegir…</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-[12px] font-bold">Email del usuario (ya registrado)</label>
          <input className={`${field} w-full`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tienda@email.com" required />
        </div>
        <button type="submit" disabled={busy} className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-bold text-white hover:bg-brand-darker disabled:opacity-60">
          {busy ? "Vinculando…" : "Vincular"}
        </button>
      </form>
      {error && <p className="mt-2 text-[13px] font-semibold text-red-600">{error}</p>}
      {ok && <p className="mt-2 text-[13px] font-semibold text-emerald-700">✓ {ok}</p>}

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3">Tienda</th>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {members.length ? (
              members.map((m) => (
                <tr key={`${m.userId}-${m.storeId}`} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-semibold">{m.storeName}</td>
                  <td className="px-4 py-3 text-slate-600">{m.email}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => unlink(m)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-[12px] font-semibold text-red-600 hover:bg-red-50">
                      Desvincular
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-400">Todavía no hay tiendas vinculadas.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
