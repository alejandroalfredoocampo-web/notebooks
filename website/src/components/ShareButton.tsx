"use client";

import { useEffect, useState } from "react";

/**
 * Botón "Compartir". En mobile con soporte usa la hoja nativa (Web Share API);
 * si no, despliega links directos a WhatsApp/Telegram/X/Facebook + copiar link.
 * La URL se resuelve en el cliente desde window.location (siempre absoluta y correcta).
 */
export default function ShareButton({ title, text }: { title: string; text: string }) {
  const [url, setUrl] = useState("");
  const [canNative, setCanNative] = useState(false);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(window.location.href);
    setCanNative(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  const shareText = `${text}`;
  const enc = (s: string) => encodeURIComponent(s);
  const links = url
    ? [
        { label: "WhatsApp", href: `https://wa.me/?text=${enc(`${shareText} ${url}`)}` },
        { label: "Telegram", href: `https://t.me/share/url?url=${enc(url)}&text=${enc(shareText)}` },
        { label: "X", href: `https://twitter.com/intent/tweet?text=${enc(shareText)}&url=${enc(url)}` },
        { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
      ]
    : [];

  async function handleClick() {
    if (canNative) {
      try {
        await navigator.share({ title, text: shareText, url });
        return;
      } catch {
        // el usuario canceló o falló → caer al menú
      }
    }
    setOpen((o) => !o);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-blue hover:underline"
        aria-haspopup={!canNative}
        aria-expanded={open}
      >
        🔗 Compartir
      </button>

      {!canNative && open && (
        <div className="absolute left-0 top-7 z-30 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-100"
            >
              {l.label}
            </a>
          ))}
          <button
            type="button"
            onClick={copy}
            className="block w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-100"
          >
            {copied ? "¡Copiado! ✓" : "Copiar link"}
          </button>
        </div>
      )}
    </div>
  );
}
