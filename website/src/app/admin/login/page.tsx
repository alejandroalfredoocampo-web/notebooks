"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push(sp.get("next") || "/admin");
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "No se pudo iniciar sesión");
    }
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center">
      <h1 className="mb-1 text-xl font-extrabold tracking-tight">Consola de administración</h1>
      <p className="mb-5 text-sm text-slate-500">Ingresá la contraseña para continuar.</p>
      <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="mb-1 block text-[13px] font-bold">Contraseña</label>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue"
          placeholder="••••••••"
        />
        {error && <p className="mb-3 text-[13px] font-semibold text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-blue px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-darker disabled:opacity-60"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
