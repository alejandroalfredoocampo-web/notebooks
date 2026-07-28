"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Prefill = {
  brand: string;
  name: string;
  cpu: string;
  cpuFamily: string;
  ramGb: number | "";
  storageGb: number | "";
  gpu: string;
  gpuType: "integrada" | "dedicada";
  screenSizeIn: number | "";
  partNumber: string;
  imageUrl: string;
};
type Source = { id: string; title: string; store: string; price: number };

const CPU_FAMILIES = ["i3", "i5", "i7", "i9", "ultra9", "ryzen5", "ryzen7", "ryzen9", "apple-m"];
const OS_OPTIONS = ["Windows 11 Home", "Windows 11 Pro", "macOS", "Sin sistema operativo", "FreeDOS", "ChromeOS"];
const USE_CASES = [
  { value: "gaming", label: "Gaming" },
  { value: "diseno", label: "Diseño / 3D" },
  { value: "programar", label: "Programar" },
  { value: "oficina", label: "Oficina" },
  { value: "estudiar", label: "Estudiar" },
];

export default function NewModelForm({ prefill, source }: { prefill?: Prefill; source?: Source }) {
  const router = useRouter();
  const [form, setForm] = useState({
    brand: prefill?.brand ?? "",
    name: prefill?.name ?? "",
    cpu: prefill?.cpu ?? "",
    cpuFamily: prefill?.cpuFamily ?? "",
    ramGb: String(prefill?.ramGb ?? ""),
    storageGb: String(prefill?.storageGb ?? ""),
    gpu: prefill?.gpu ?? "",
    gpuType: prefill?.gpuType ?? "integrada",
    screenSizeIn: String(prefill?.screenSizeIn ?? ""),
    screenResolution: "1920x1080 (FHD)",
    os: "Windows 11 Home",
    partNumber: prefill?.partNumber ?? "",
    imageUrl: prefill?.imageUrl ?? "",
  });
  const [useCases, setUseCases] = useState<string[]>([]);
  const [state, setState] = useState<{ kind: "idle" | "ok" | "error"; msg?: string }>({ kind: "idle" });
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const toggleUse = (v: string) =>
    setUseCases((u) => (u.includes(v) ? u.filter((x) => x !== v) : [...u, v]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setState({ kind: "idle" });
    const res = await fetch("/api/admin/model", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        ramGb: Number(form.ramGb),
        storageGb: Number(form.storageGb),
        screenSizeIn: Number(form.screenSizeIn) || undefined,
        useCases,
        fromListingId: source?.id,
        fromTitle: source?.title,
      }),
    });
    const j = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok) {
      setState({
        kind: "ok",
        msg: `Modelo "${j.model.brand} ${j.model.name}" creado${source ? " y publicación matcheada" : ""}. Publicá al sitio (en el panel) y reconstruí para verlo online.`,
      });
    } else {
      setState({ kind: "error", msg: j.error || "No se pudo crear el modelo." });
    }
  }

  const field = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue";
  const label = "mb-1 block text-[13px] font-bold";

  if (state.kind === "ok") {
    return (
      <div className="max-w-2xl rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="text-[14px] font-semibold text-emerald-800">{state.msg}</p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => router.push("/admin/revision")}
            className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-bold text-white hover:bg-brand-darker"
          >
            Volver a la revisión
          </button>
          <button
            onClick={() => { setState({ kind: "idle" }); router.push("/admin/nuevo-modelo"); }}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Crear otro
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Marca *</label>
          <input className={field} value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Lenovo" />
        </div>
        <div>
          <label className={label}>Nombre del modelo *</label>
          <input className={field} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="IdeaPad Slim 3 15IRH8" />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Procesador *</label>
          <input className={field} value={form.cpu} onChange={(e) => set("cpu", e.target.value)} placeholder="Intel Core i5-13420H" />
        </div>
        <div>
          <label className={label}>Familia de CPU</label>
          <select className={field} value={form.cpuFamily} onChange={(e) => set("cpuFamily", e.target.value)}>
            <option value="">— Elegí —</option>
            {CPU_FAMILIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label className={label}>RAM (GB) *</label>
          <input className={field} inputMode="numeric" value={form.ramGb} onChange={(e) => set("ramGb", e.target.value)} placeholder="16" />
        </div>
        <div>
          <label className={label}>Almacenamiento (GB) *</label>
          <input className={field} inputMode="numeric" value={form.storageGb} onChange={(e) => set("storageGb", e.target.value)} placeholder="512" />
        </div>
        <div>
          <label className={label}>Pantalla (pulgadas)</label>
          <input className={field} inputMode="decimal" value={form.screenSizeIn} onChange={(e) => set("screenSizeIn", e.target.value)} placeholder="15.6" />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Placa de video</label>
          <input className={field} value={form.gpu} onChange={(e) => set("gpu", e.target.value)} placeholder="NVIDIA GeForce RTX 4060 / Integrada" />
        </div>
        <div>
          <label className={label}>Tipo de GPU</label>
          <select className={field} value={form.gpuType} onChange={(e) => set("gpuType", e.target.value)}>
            <option value="integrada">Integrada</option>
            <option value="dedicada">Dedicada (gamer)</option>
          </select>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Sistema operativo</label>
          <select className={field} value={form.os} onChange={(e) => set("os", e.target.value)}>
            {OS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Part number</label>
          <input className={field} value={form.partNumber} onChange={(e) => set("partNumber", e.target.value)} placeholder="83DG009XAR" />
        </div>
      </div>

      <div className="mt-4">
        <label className={label}>URL de imagen</label>
        <input className={field} value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://…/foto.jpg" />
      </div>

      <div className="mt-4">
        <label className={label}>Usos recomendados</label>
        <div className="flex flex-wrap gap-2">
          {USE_CASES.map((u) => (
            <button
              type="button"
              key={u.value}
              onClick={() => toggleUse(u.value)}
              className={`rounded-full border px-3 py-1 text-[13px] font-semibold transition ${
                useCases.includes(u.value)
                  ? "border-brand-blue bg-blue-50 text-brand-blue"
                  : "border-slate-300 text-slate-500 hover:bg-slate-50"
              }`}
            >
              {u.label}
            </button>
          ))}
        </div>
      </div>

      {state.kind === "error" && (
        <p className="mt-4 text-[13px] font-semibold text-red-600">{state.msg}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-5 rounded-lg bg-brand-blue px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-darker disabled:opacity-60"
      >
        {loading ? "Creando…" : "Crear modelo"}
      </button>
    </form>
  );
}
