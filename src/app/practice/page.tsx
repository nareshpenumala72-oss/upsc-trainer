"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";

type DailySet = { id: string; date: string };

// This is the GS filter set you wanted
const GS_OPTIONS = ["All", "GS1", "GS2", "GS3", "GS4"] as const;
type GsFilter = (typeof GS_OPTIONS)[number];

function localTodayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
}

export default function PracticeHomePage() {
  const [sets, setSets] = useState<DailySet[]>([]);
  const [loading, setLoading] = useState(true);
  const [gs, setGs] = useState<GsFilter>("All");

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("daily_sets")
        .select("id, date")
        .order("date", { ascending: false });

      if (!error) setSets((data || []) as DailySet[]);
      setLoading(false);
    })();
  }, []);

  // ✅ IMPORTANT:
  // Daily sets are date containers. GS filtering is applied inside the day page
  // (because MCQs belong to date via daily_set_items).
  // Here we still show GS filter UI and pass it as query parameter to the day page.
  const filteredSets = useMemo(() => sets, [sets]);

  const today = localTodayISO();

  return (
    <AuthGuard>
      <main className="max-w-4xl mx-auto p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Practice</h1>
            <p className="text-sm text-gray-600">
              Choose a date to attempt MCQs + Mains. Use GS filter to focus on a paper.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">GS Filter:</span>
            <select
              className="w-auto"
              value={gs}
              onChange={(e) => setGs(e.target.value as GsFilter)}
            >
              {GS_OPTIONS.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <Link className="btn btn-primary" href={`/day/${today}?gs=${gs}`}>
            Open Today
          </Link>
          <Link className="btn btn-secondary" href="/archive">
            Archive
          </Link>
        </div>

        {loading && <p>Loading...</p>}

        {!loading && filteredSets.length === 0 && (
          <div className="card card-body">
            <p>No practice sets available yet.</p>
            <p className="text-sm text-gray-600 mt-2">
              Admin needs to publish at least one daily set.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {filteredSets.map((s) => (
            <Link
              key={s.id}
              href={`/day/${s.date}?gs=${gs}`}
              className="block card card-body hover:bg-gray-50 transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">{s.date}</div>
                  <div className="text-sm text-gray-600">
                    Open practice ({gs === "All" ? "All GS" : gs})
                  </div>
                </div>
                <div className="text-sm text-gray-500">→</div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </AuthGuard>
  );
}