"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";

type GsFilter = "All" | "GS1" | "GS2" | "GS3" | "GS4";
const GS_OPTIONS: GsFilter[] = ["All", "GS1", "GS2", "GS3", "GS4"];

export default function CurrentAffairsHomePage() {
  const [loading, setLoading] = useState(true);
  const [gs, setGs] = useState<GsFilter>("All");
  const [dates, setDates] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);

      let q = supabase
        .from("current_affairs")
        .select("date, gs_paper")
        .order("date", { ascending: false });

      if (gs !== "All") q = q.eq("gs_paper", gs);

      const { data, error } = await q;

      if (!error) {
        const uniqueDates = Array.from(
          new Set((data || []).map((r: any) => r.date as string))
        );
        setDates(uniqueDates);
      } else {
        setDates([]);
      }

      setLoading(false);
    })();
  }, [gs]);

  const list = useMemo(() => dates, [dates]);

  return (
    <AuthGuard>
      <main className="max-w-4xl mx-auto p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Current Affairs</h1>
            <p className="text-sm text-gray-600">
              Browse current affairs date-wise. Filter by GS paper.
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
          <Link className="btn btn-secondary" href="/practice">
            Practice
          </Link>
          <Link className="btn btn-secondary" href="/dashboard">
            Dashboard
          </Link>
        </div>

        {loading && <p>Loading...</p>}

        {!loading && list.length === 0 && (
          <div className="card card-body">
            <p>No current affairs available for this filter.</p>
            <p className="text-sm text-gray-600 mt-2">
              Add at least one row to <b>current_affairs</b> table with a date and gs_paper.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {list.map((d) => (
            <Link
              key={d}
              href={`/current-affairs/${d}?gs=${gs}`}
              className="block card card-body hover:bg-gray-50 transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">{d}</div>
                  <div className="text-sm text-gray-600">
                    Open Current Affairs ({gs === "All" ? "All GS" : gs})
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