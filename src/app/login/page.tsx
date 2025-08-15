"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setMsg(null); setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setMsg(error.message);
    // sukses → ke Vendors (atau halaman mana pun)
    r.push("/vendors");
  };

  // (opsional) kirim magic link kalau kamu pakai SMTP
  const sendMagicLink = async () => {
    setMsg(null); setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/vendors` }});
    setLoading(false);
    if (error) return setMsg(error.message);
    setMsg("Magic link sent. Check your email.");
  };

  return (
    <main className="max-w-sm mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <div className="space-y-2">
        <Input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <Input placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <Button onClick={signIn} disabled={loading} className="w-full">
          {loading ? "Signing in..." : "Sign in"}
        </Button>
        {/* Kalau SMTP aktif dan mau pakai OTP, tampilkan tombol ini */}
        {/* <Button variant="outline" onClick={sendMagicLink} disabled={loading} className="w-full">Send magic link</Button> */}
        {msg && <p className="text-sm text-red-600">{msg}</p>}
      </div>
    </main>
  );
}
