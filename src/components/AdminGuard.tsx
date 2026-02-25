"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        router.replace("/login");
        return;
      }

      const { data: p, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", uid)
        .single();

      if (error || !p || p.role !== "admin") {
        router.replace("/dashboard");
        return;
      }

      if (active) setOk(true);
    })();

    return () => {
      active = false;
    };
  }, [router]);

  if (!ok) return <div className="p-6">Checking admin access...</div>;
  return <>{children}</>;
}