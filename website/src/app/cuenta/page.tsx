"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/lib/useUser";
import { getSupabaseBrowser, authConfigured } from "@/lib/supabaseBrowser";

const USES = [
  { v: "estudiar", l: "Estudio" },
  { v: "oficina", l: "Oficina" },
  { v: "gaming", l: "Gaming" },
  { v: "diseno", l: "Diseño / edición" },
  { v: "programar", l: "Programación" },
];
const BRANDS = [
  { v: "lenovo", l: "Lenovo" },
  { v: "hp", l: "HP" },
  { v: "asus", l: "Asus" },
  { v: "dell", l: "Dell" },
  { v: "acer", l: "Acer" },
  { v: "apple", l: "Apple" },
  { v: "samsung", l: "Samsung" },
];

export default function CuentaPage() {
  const { user, loading } = useUser();
  const [uses, setUses] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [budget, setBudget] = useState<string>("");
  const [emailRecos, setEmailRecos] = useState(true);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    const sb = getSupabaseBrowser();
    if (!sb) return;
    sb.from("user_interests").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setUses(data.uses ?? []);
        setBrands(data.brands ?? []);
        setBudget(data.budget_max ? String(data.budget_max) : "");
        setEmailRecos(data.email_recos ?? true);
      }
    });
  }, [user]);

  if (!authConfigured()) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-slate-500">El login todavía no está disponible.</div>;
  }
  if (loading) return <div className="mx-auto max-w-6xl px-4 py-16 text-center text-slate-400">Cargando…</div>;
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold">Preferencias</h1>
        <p className="mt-2 text-sm text-slate-500">Ingresá para configurar tus intereses.</p>
        <Link href="/ingresar" className="mt-5 inline-block rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-darker">
          Ingresar
        </Link>
      </div>
    );
  }

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  async function save() {
    const sb = getSupabaseBrowser();
    if (!sb || !user) return;
    setBusy(true);
    setSaved(false);
    await sb.from("user_interests").upsert(
      {
        user_id: user.id,
        uses,
        brands,
        budget_max: budget ? Number(budget) : null,
        email_recos: emailRecos,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    setBusy(false);
    setSaved(true);
  }

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-[13px] font-semibold transition ${
      active ? "border-brand-blue bg-blue-50 text-brand-blue" : "border-slate-200 text-slate-600 hover:border-slate-300"
    }`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-extrabold tracking-tight">Preferencias</h1>
      <p className="mt-1 text-sm text-slate-500">
        Contanos qué buscás y te recomendamos notebooks por mail. {user.email}
      </p>

      <section className="mt-6">
        <h2 className="mb-2 text-[13px] font-bold">¿Para qué la usás?</h2>
        <div className="flex flex-wrap gap-2">
          {USES.map((u) => (
            <button key={u.v} onClick={() => toggle(uses, setUses, u.v)} className={chip(uses.includes(u.v))}>
              {u.l}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-[13px] font-bold">Marcas que te interesan</h2>
        <div className="flex flex-wrap gap-2">
          {BRANDS.map((b) => (
            <button key={b.v} onClick={() => toggle(brands, setBrands, b.v)} className={chip(brands.includes(b.v))}>
              {b.l}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-[13px] font-bold">Presupuesto máximo (ARS)</h2>
        <input
          type="number"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="ej. 1500000"
          className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue"
        />
      </section>

      <label className="mt-6 flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" className="accent-brand-blue" checked={emailRecos} onChange={(e) => setEmailRecos(e.target.checked)} />
        Quiero recibir recomendaciones por email
      </label>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-darker disabled:opacity-60"
        >
          {busy ? "Guardando…" : "Guardar preferencias"}
        </button>
        {saved && <span className="text-[13px] font-semibold text-emerald-700">✓ Guardado</span>}
      </div>
    </div>
  );
}
