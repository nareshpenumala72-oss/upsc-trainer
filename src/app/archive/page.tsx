"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AuthGuard from "@/components/AuthGuard";

type DailySetRow = { id: string; date: string };

type AttemptAgg = {
  daily_set_id: string;
  total: number;
  correct: number;
};

function pct(correct: number, total: number) {
  if (!total) return "0";
  return ((correct / total) * 100).toFixed(0);
}

export default function ArchivePage() {
  const [sets, setSets] = useState<DailySetRow[]>([]);
  const [attemptMap, setAttemptMap] = useState<Record<string, AttemptAgg>>({});
  const [loading, setLoading] = useState(true);

  const todayStr = useMemo(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().split("T")[0];
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;

      const { data: ds } = await supabase
        .from("daily_sets")
        .select("id, date")
        .order("date", { ascending: false });

      const dailySets = ds || [];
      setSets(dailySets);

      // If not logged in, just show archive list (AuthGuard usually prevents this)
      if (!userId || dailySets.length === 0) {
        setAttemptMap({});
        setLoading(false);
        return;
      }

      // Fetch all attempts for this user (we will aggregate by daily_set_id)
      const { data: attempts } = await supabase
        .from("mcq_attempts")
        .select("daily_set_id, is_correct")
        .eq("user_id", userId);

      const agg: Record<string, AttemptAgg> = {};
      (attempts || []).forEach((a: any) => {
        const id = a.daily_set_id as string;
        if (!agg[id]) agg[id] = { daily_set_id: id, total: 0, correct: 0 };
        agg[id].total += 1;
        if (a.is_correct) agg[id].correct += 1;
      });

      setAttemptMap(agg);
      setLoading(false);
    })();
  }, []);

  return (
    <AuthGuard>
      <main className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Practice Archive</h1>

        {loading && <p>Loading...</p>}
        {!loading && sets.length === 0 && <p>No practice sets available yet.</p>}

        <div className="space-y-3">
          {sets.map((set) => {
            const a = attemptMap[set.id];
            const attempted = !!a && a.total > 0;
            const isToday = set.date === todayStr;

            return (
              <div key={set.id} className="card card-body">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm text-gray-500">
                      {isToday ? "Today" : "Daily Practice"}
                    </div>
                    <div className="text-lg font-semibold">{set.date}</div>

                    <div className="mt-2 text-sm">
                      {attempted ? (
                        <span>
                          ✅ Attempted • <b>{a.correct}</b>/<b>{a.total}</b> correct •{" "}
                          <b>{pct(a.correct, a.total)}%</b>
                        </span>
                      ) : (
                        <span className="text-gray-600">❌ Not attempted yet</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link className="btn btn-secondary" href={`/day/${set.date}`}>
                      {attempted ? "Open" : "Start"}
                    </Link>
                    {attempted && (
                      <Link className="btn btn-primary" href={`/day/${set.date}/review`}>
                        Review
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </AuthGuard>
  );
}