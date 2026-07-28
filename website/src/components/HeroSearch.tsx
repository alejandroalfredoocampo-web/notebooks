"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * Buscador de la home. Mantiene el <form> GET a /notebooks (funciona sin JS y sin
 * micrófono) y suma, cuando el navegador lo soporta, un botón de dictado por voz
 * (Web Speech API, es-AR) que alimenta el mismo buscador → parseQuery lo interpreta.
 * Ver spec 03 y la política de privacidad en /privacidad.
 */
type SRState = "idle" | "listening" | "denied" | "error";

export default function HeroSearch() {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<SRState>("idle");

  useEffect(() => {
    // Detección client-only (evita mismatch de hidratación)
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  function startVoice() {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
      if (inputRef.current) inputRef.current.value = (finalText || interim).trim();
    };
    rec.onerror = (e: any) => {
      setState(e.error === "not-allowed" || e.error === "service-not-allowed" ? "denied" : "error");
    };
    rec.onend = () => {
      setState((s) => (s === "denied" ? s : "idle"));
      const v = inputRef.current?.value.trim();
      if (v) formRef.current?.requestSubmit();
    };

    // Timeout de seguridad
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
    <div className="mx-auto mt-8 max-w-xl">
      <form ref={formRef} action="/notebooks" className="relative">
        <input
          ref={inputRef}
          type="text"
          name="q"
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
