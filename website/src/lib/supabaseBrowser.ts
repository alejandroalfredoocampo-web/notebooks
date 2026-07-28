"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase para el navegador (auth de usuarios, spec 07). Guarda la
 * sesión en localStorage. Usa las envs PÚBLICAS NEXT_PUBLIC_* (la anon key es
 * pública por diseño). Si no están seteadas todavía, devuelve null y la UI de
 * login degrada con gracia (mensaje "login no disponible") sin romper el sitio.
 */
let client: SupabaseClient | null | undefined;

export function getSupabaseBrowser(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && anon ? createClient(url, anon) : null;
  return client;
}

export const authConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
