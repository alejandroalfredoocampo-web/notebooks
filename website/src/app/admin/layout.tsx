import Link from "next/link";
import type { Metadata } from "next";
import AdminNav from "@/components/admin/AdminNav";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-brand-blue">
            Consola de administración
          </div>
          <Link href="/admin" className="text-lg font-extrabold tracking-tight">
            notebooks<span className="text-brand-blue">.com.ar</span>
          </Link>
        </div>
        <AdminNav />
      </div>
      {children}
    </div>
  );
}
