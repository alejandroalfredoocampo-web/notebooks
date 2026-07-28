import { NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_PASSWORD, ADMIN_SESSION_TOKEN } from "@/lib/adminAuth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (body?.password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, ADMIN_SESSION_TOKEN, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 h
  });
  return res;
}
