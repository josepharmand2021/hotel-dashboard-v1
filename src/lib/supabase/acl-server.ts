// lib/supabase/acl-server.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/** Buat client Supabase server-side (Next 15+: cookies() async) */
async function sbServer() {
  const cookieStore = await cookies(); // ⬅️ penting: await

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // RLS yang jaga
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options?: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // RSC/read-only — aman diabaikan
          }
        },
        remove(name: string, options?: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 });
          } catch {}
        },
      },
    }
  );
}

export async function getAclServer() {
  const sb = await sbServer(); // ⬅️ await
  const { data: { user } } = await sb.auth.getUser();
  const [{ data: isAdmin }, { data: isViewer }] = await Promise.all([
    sb.rpc("has_role", { p_role: "admin" }),
    sb.rpc("has_role", { p_role: "viewer" }),
  ]);
  return { user, isAdmin: !!isAdmin, isViewer: !!isViewer };
}

export async function isAdminServer() {
  const sb = await sbServer(); // ⬅️ await
  const { data } = await sb.rpc("has_role", { p_role: "admin" });
  return !!data;
}

export async function requireAdminServer() {
  if (!(await isAdminServer())) throw new Error("Forbidden");
}
