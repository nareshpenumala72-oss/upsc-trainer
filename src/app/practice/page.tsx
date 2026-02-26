"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AuthGuard from "@/components/AuthGuard";

function localISODate(d: Date) {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
}

export default function PracticePage() {
  const router = useRouter();
  const [msg, setMsg] = useState("Loading practice...");

  useEffect(() => {
    (async () => {
      const today = new Date();
      const todayStr = localISODate(today);

      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const yesterdayStr = localISODate(y);

      // 1) Try today
      const { data: todaySet, error: e1 } = await supabase
        .from("daily_sets")
        .select("date")
        .eq("date", todayStr)
        .maybeSingle();

      if (e1) {
        setMsg("Something went wrong. Please try again.");
        return;
      }
      if (todaySet) {
        router.replace(`/day/${todayStr}`);
        return;
      }

      // 2) Try yesterday
      const { data: ySet, error: e2 } = await supabase
        .from("daily_sets")
        .select("date")
        .eq("date", yesterdayStr)
        .maybeSingle();

      if (e2) {
        setMsg("Something went wrong. Please try again.");
        return;
      }
      if (ySet) {
        setMsg("Today not uploaded yet — opening yesterday’s practice.");
        router.replace(`/day/${yesterdayStr}`);
        return;
      }

      // 3) Fallback to latest available set
      const { data: latest, error: e3 } = await supabase
        .from("daily_sets")
        .select("date")
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (e3) {
        setMsg("Something went wrong. Please try again.");
        return;
      }

      if (latest?.date) {
        setMsg("Opening the latest available practice set.");
        router.replace(`/day/${latest.date}`);
        return;
      }

      // 4) Nothing exists
      setMsg("No practice sets available yet. Please check later.");
    })();
  }, [router]);

  return (
    <AuthGuard>
      <main className="max-w-3xl mx-auto">
        <div className="card card-body">
          <h1>Practice</h1>
          <p className="mt-2 text-gray-700">{msg}</p>

          <div className="mt-4 flex gap-2">
            <a className="btn btn-secondary" href="/archive">
              Open Archive
            </a>
            <a className="btn btn-secondary" href="/dashboard">
              Go to Dashboard
            </a>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}