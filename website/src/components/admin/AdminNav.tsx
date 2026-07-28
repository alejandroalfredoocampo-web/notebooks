"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Panel" },
  { href: "/admin/revision", label: "Revisión" },
  { href: "/admin/publicaciones", label: "Publicaciones" },
  { href: "/admin/solicitudes", label: "Solicitudes" },
  { href: "/admin/blog", label: "Blog" },
  { href: "/admin/nueva", label: "Nueva publicación" },
  { href: "/admin/nuevo-modelo", label: "Nuevo modelo" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  // No mostrar la nav en el login
  if (pathname === "/admin/login") return null;

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <nav className="flex flex-wrap items-center gap-1 text-[13px] font-semibold">
      {LINKS.map((l) => {
        const active = l.href === "/admin" ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-lg px-3 py-1.5 transition ${
              active ? "bg-brand-blue text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
      <button
        onClick={logout}
        className="ml-2 rounded-lg border border-slate-200 px-3 py-1.5 text-slate-500 transition hover:bg-slate-100"
      >
        Salir
      </button>
    </nav>
  );
}
