"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fmtARS } from "@/lib/format";

/**
 * Buscador de la home. Mantiene el <form> GET a /notebooks (funciona sin JS) y suma:
 * - Autocomplete: sugerencias en vivo de modelos/marcas (/api/search/suggest).
 * - Dictado por voz (Web Speech API, es-AR) → alimenta el mismo buscador (spec 03).
 * Ver política de privacidad en /privacidad.
 */
type SRState = "idle" | "listening" | "denied" | "error";
type Suggest = {
  models: { id: string; label: string; brandSlug: string; slug: string; price: number }[];
  brands: { name: string; slug: string; count: number }[];
};

export default function HeroSearch() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<SRState>("idle");
  const [value, setValue] = useState("");
  const [sug, setSug] = useState<Suggest | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SR);
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  function onChange(v: string) {
    setValue(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length < 2) {
      setSug(null);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(v.trim())}`);
        const data: Suggest = await res.json();
        setSug(data);
        setOpen((data.models?.length ?? 0) + (data.brands?.length ?? 0) > 0);
      } catch {
        setSug(null);
      }
    }, 180);
  }

  function startVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || state === "listening" || state === "denied") return;
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = "es-AR";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    rec.onstart = () => setState("listening");
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      setValue((finalText || interim).trim());
    };
    rec.onerror = (e: any) =>
      setState(e.error === "not-allowed" || e.error === "service-not-allowed" ? "denied" : "error");
    rec.onend = () => {
      setState((s) => (s === "denied" ? s : "idle"));
      if (inputRef.current?.value.trim()) formRef.current?.requestSubmit();
    };
    setTimeout(() => {
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    }, 8000);
    try {
      rec.start();
    } catch {
      setState("error");
    }
  }

  return (
    <div className="mx-auto mt-8 max-w-xl" ref={boxRef}>
      <form ref={formRef} action="/notebooks" className="relative" autoComplete="off">
        <input
          ref={inputRef}
          type="text"
          name="q"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => sug && setOpen(true)}
          placeholder="¿Qué notebook estás buscando?"
          className="h-13 w-full rounded-full border-0 py-4 pl-6 pr-24 text-base text-slate-900 shadow-xl outline-none ring-2 ring-transparent focus:ring-brand-cyan"
        />
        {supported && (
          <button
            type="button"
            onClick={startVoice}
            aria-label="Buscar por voz"
            aria-pressed={state === "listening"}
            disabled={state === "denied"}
            title={state === "denied" ? "Micrófono bloqueado" : "Buscar por voz"}
            className={`absolute right-14 top-2 flex h-10 w-10 items-center justify-center rounded-full text-lg transition ${
              state === "listening"
                ? "animate-pulse bg-red-500 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-40"
            }`}
          >
            🎤
          </button>
        )}
        <button
          type="submit"
          aria-label="Buscar"
          className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue text-lg text-white transition hover:bg-brand-darker"
        >
          →
        </button>

        {/* Autocomplete */}
        {open && sug && (
          <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-xl">
            {sug.brands.map((b) => (
              <Link
                key={`b-${b.slug}`}
                href={`/marcas/${b.slug}`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50"
              >
                <span className="font-semibold text-slate-700">Ver marca {b.name}</span>
                <span className="text-[12px] text-slate-400">{b.count} modelos</span>
              </Link>
            ))}
            {sug.models.map((m) => (
              <Link
                key={m.id}
                href={`/notebooks/${m.brandSlug}/${m.slug}`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5 text-sm hover:bg-slate-50 first:border-t-0"
              >
                <span className="truncate font-medium text-slate-800">{m.label}</span>
                {m.price > 0 && <span className="shrink-0 text-[13px] font-bold text-slate-900">{fmtARS(m.price)}</span>}
              </Link>
            ))}
          </div>
        )}
      </form>

      {state === "listening" && (
        <p className="mt-2 text-[13px] font-medium text-brand-cyan">🎙️ Te escucho… hablá ahora</p>
      )}
      {state === "denied" && (
        <p className="mt-2 text-[13px] text-slate-300">
          No pudimos acceder al micrófono. Escribí tu búsqueda o habilitá el permiso en el navegador.
        </p>
      )}
      {supported && state !== "denied" && (
        <p className="mt-2 text-[11px] text-slate-400">
          Al usar el micrófono aceptás nuestra{" "}
          <Link href="/privacidad" className="underline hover:text-white">
            política de privacidad
          </Link>
          .
        </p>
      )}
    </div>
  );
}
