"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/useUser";
import { getSupabaseBrowser, authConfigured } from "@/lib/supabaseBrowser";
import { invalidateFavorites } from "@/lib/favorites";

/**
 * Indicador de sesión para el header (spec 07). "Ingresar" o menú "Mi cuenta".
 * Si Auth no está configurado, no renderiza nada (degrada con gracia).
 */
export default function AuthNav({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const router = useRouter();
  const { user, loading } = useUser();
  const [open, setOpen] = useState(false);

  if (!authConfigured() || loading) return null;

  async function signOut() {
    await getSupabaseBrowser()?.auth.signOut();
    invalidateFavorites();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  if (variant === "mobile") {
    return user ? (
      <>
        <Link href="/favoritos" className="rounded-lg px-2 py-2.5 hover:bg-slate-100">♥ Favoritos</Link>
        <Link href="/cuenta" className="rounded-lg px-2 py-2.5 hover:bg-slate-100">Preferencias</Link>
        <button onClick={signOut} className="rounded-lg px-2 py-2.5 text-left hover:bg-slate-100">Salir</button>
      </>
    ) : (
      <Link href="/ingresar" className="rounded-lg px-2 py-2.5 font-bold text-brand-blue hover:bg-slate-100">
        Ingresar
      </Link>
    );
  }

  if (!user) {
    return (
      <Link
        href="/ingresar"
        className="rounded-lg border-[1.5px] border-brand-blue px-3 py-1.5 text-sm font-bold text-brand-blue transition hover:bg-blue-50"
      >
        Ingresar
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
        aria-expanded={open}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-blue text-[11px] font-bold text-white">
          {(user.email ?? "?")[0].toUpperCase()}
        </span>
        Mi cuenta ▾
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
          <Link
            href="/favoritos"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-100"
          >
            ♥ Favoritos
          </Link>
          <Link
            href="/cuenta"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-100"
          >
            Preferencias
          </Link>
          <button
            onClick={signOut}
            className="block w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-100"
          >
            Salir
          </button>
        </div>
      )}
    </div>
  );
}
