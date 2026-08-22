"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export default function IngresarPage() {
  const router = useRouter();
  const sb = getSupabaseBrowser();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!sb) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold">Ingresar</h1>
        <p className="mt-3 text-sm text-slate-500">
          El login todavía no está disponible. Estamos terminando de configurarlo.
        </p>
      </div>
    );
  }

  async function withEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      if (mode === "signup") {
        const { error } = await sb!.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Te enviamos un email para confirmar tu cuenta. Revisá tu casilla.");
      } else {
        const { error } = await sb!.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/favoritos");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function withGoogle() {
    setError(null);
    const redirectTo = `${window.location.origin}/ingresar`;
    const { error } = await sb!.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) setError(error.message);
  }

  const field =
    "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-blue";

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-extrabold tracking-tight">
        {mode === "login" ? "Ingresar" : "Crear cuenta"}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Guardá tus favoritos y recibí recomendaciones. Gratis.
      </p>

      <button
        onClick={withGoogle}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
      >
        <span aria-hidden>🔵</span> Continuar con Google
      </button>

      <div className="my-5 flex items-center gap-3 text-[12px] text-slate-400">
        <span className="h-px flex-1 bg-slate-200" /> o con tu email <span className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={withEmail} className="space-y-3">
        <input
          type="email"
          required
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={field}
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Contraseña (mín. 6)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={field}
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-darker disabled:opacity-60"
        >
          {busy ? "..." : mode === "login" ? "Ingresar" : "Crear cuenta"}
        </button>
      </form>

      {/* `role="alert"` + `aria-live`: sin esto, un lector de pantalla no anuncia el error
          y la persona se queda esperando frente a un formulario que ya falló. */}
      {error && <p role="alert" aria-live="assertive" className="mt-3 text-[13px] font-semibold text-red-600">{error}</p>}
      {msg && <p className="mt-3 text-[13px] font-semibold text-emerald-700">{msg}</p>}

      <p className="mt-5 text-center text-[13px] text-slate-500">
        {mode === "login" ? "¿No tenés cuenta?" : "¿Ya tenés cuenta?"}{" "}
        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
            setMsg(null);
          }}
          className="font-semibold text-brand-blue hover:underline"
        >
          {mode === "login" ? "Creá una" : "Ingresá"}
        </button>
      </p>

      <p className="mt-6 text-center text-[11px] text-slate-400">
        Al ingresar aceptás nuestra{" "}
        <Link href="/privacidad" className="underline">política de privacidad</Link>.
      </p>
    </div>
  );
}
