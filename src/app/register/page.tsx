// app/register/page.tsx
"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    const { data, error } = await sb.auth.signUp({
      email,
      password,
      // Untuk PROD, ganti origin sesuai domain kamu
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) return setMsg(error.message);

    // Jika email confirmation OFF (dev), session sudah ada → lanjutkan
    if (data.session) {
      // (opsional) buat/isi user_profiles
      await sb.from("user_profiles").upsert({
        user_id: data.user!.id,
        full_name: fullName || email.split("@")[0],
      });

      // pastikan user jadi viewer
      await sb.rpc("ensure_viewer_for_me");

      router.replace("/vendors");
      return;
    }

    // Jika confirmation ON (prod), user diminta cek email
    setMsg("Silakan cek email kamu untuk verifikasi. Setelah klik link, kamu akan login otomatis.");
  }

  return (
    <main className="p-6 max-w-sm space-y-3">
      <h1 className="text-xl font-semibold">Register</h1>
      <form onSubmit={onSubmit} className="space-y-2">
        <input className="border rounded px-3 py-2 w-full"
               placeholder="Nama lengkap (opsional)"
               value={fullName} onChange={e=>setFullName(e.target.value)} />
        <input className="border rounded px-3 py-2 w-full"
               placeholder="Email" type="email"
               value={email} onChange={e=>setEmail(e.target.value)} required />
        <input className="border rounded px-3 py-2 w-full"
               placeholder="Password" type="password"
               value={password} onChange={e=>setPassword(e.target.value)} required />
        <button className="bg-black text-white px-3 py-2 rounded">Daftar</button>
      </form>
      {msg && <p className="text-sm text-gray-700">{msg}</p>}
    </main>
  );
}
