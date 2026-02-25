"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TestSupabasePage() {
  const [status, setStatus] = useState("Testing...");

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        setStatus(`✅ Connected to Supabase. Session: ${data.session ? "YES" : "NO"}`);
      } catch (e: any) {
        setStatus(`❌ Failed: ${e.message ?? String(e)}`);
      }
    })();
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>Supabase Connection Test</h1>
      <p>{status}</p>
    </main>
  );
}