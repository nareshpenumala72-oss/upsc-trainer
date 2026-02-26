"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AuthGuard from "@/components/AuthGuard";

function todayISO() {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

export default function PracticePage() {
  const router = useRouter();
  const [msg, setMsg] = useState<string>("Loading today’s practice...");

  useEffect(() => {
    (async () => {
      const date = todayISO();

      const { data: ds, error } = await supabase
        .from("daily_sets")
        .select("id")
        .eq("date", date)
        .maybeSingle();

      if (error) {
        setMsg("Something went wrong. Please try again.");
        return;
      }

      if (!ds) {
        setMsg(
          `Today’s practice is not uploaded yet (${date}). Please check later.`
        );
        return;
      }

      router.replace(`/day/${date}`);
    })();
  }, [router]);

  return (
    <AuthGuard>
      <main className="max-w-3xl mx-auto">
        <div className="card card-body">
          <h1>Practice</h1>
          <p className="mt-2 text-gray-700">{msg}</p>

          <div className="mt-4 flex gap-2">
            <a className="btn btn-secondary" href="/dashboard">
              Go to Dashboard
            </a>
            <a className="btn btn-secondary" href="/login">
              Login
            </a>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}