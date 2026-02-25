"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password: pw,
    });

    if (error) return setMsg(error.message);

    if (data.user) {
      const { error: pErr } = await supabase.from("profiles").insert({
        id: data.user.id,
        full_name: fullName,
        role: "student",
      });
      if (pErr) return setMsg(pErr.message);
    }

    router.push("/login");
  }

  return (
    <main style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
      <h1>Register</h1>
      <form onSubmit={onRegister} style={{ display: "grid", gap: 12 }}>
        <input
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          placeholder="Password"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          required
        />
        <button type="submit">Create account</button>
      </form>
      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </main>
  );
}