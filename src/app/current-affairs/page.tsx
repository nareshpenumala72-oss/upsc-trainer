"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";

type CADateRow = { date: string };

const GS_OPTIONS = ["All", "GS1", "GS2", "GS3", "GS4"] as const;
type GsFilter = (typeof GS_OPTIONS)[number];

export default function CurrentAffairsHomePage() {
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [gs, setGs] = useState<GsFilter>("All");

  useEffect(() => {
    (async () => {
      setLoading(true);

      // Get unique dates from current_affairs
      const { data, error } = await supabase
        .from("current_affairs")
        .select("date")
        .order("date", { ascending: false });

      if (!error) {
        const unique = Array.from(new Set((data || []).map((r: any) => r.date)));
        setDates(unique);
      }

      setLoading(false);
    })();
  }, []);

  const filteredDates = useMemo(() => dates, [dates, gs]);

  return (
    <AuthGuard>
      <main className="max-w-4xl mx-auto p-6">
        <div className="flex items-end justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Current Affairs</h1>
            <p className="text-sm text-gray-600">
              Select a date to read current affairs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Filter:</span>
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

        {loading && <p>Loading...</p>}
        {!loading && filteredDates.length === 0 && (
          <p>No current affairs added yet.</p>
        )}

        <div className="space-y-3">
          {filteredDates.map((d) => (
            <Link
              key={d}
              href={`/current-affairs/${d}`}
              className="block card card-body hover:bg-gray-50 transition"
            >
              <div className="text-lg font-semibold">{d}</div>
              <div className="text-sm text-gray-600">Open current affairs</div>
            </Link>
          ))}
        </div>
      </main>
    </AuthGuard>
  );
}