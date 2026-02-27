"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";

type DailySet = { id: string; date: string };

const GS_OPTIONS = ["All", "GS1", "GS2", "GS3", "GS4"] as const;
type GsFilter = (typeof GS_OPTIONS)[number];

const SUBJECTS = [
  "All",
  "Polity",
  "Governance",
  "International Relations",
  "Economy",
  "Environment",
  "Science & Tech",
  "History",
  "Geography",
  "Society",
  "Ethics",
  "Security",
  "Disaster Management",
  "Agriculture",
  "Misc",
] as const;
type SubjectFilter = (typeof SUBJECTS)[number];

function localTodayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
}

export default function PracticeHomePage() {
  const [sets, setSets] = useState<DailySet[]>([]);
  const [loading, setLoading] = useState(true);

  const [gs, setGs] = useState<GsFilter>("All");
  const [subject, setSubject] = useState<SubjectFilter>("All");

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

  const filteredSets = useMemo(() => sets, [sets]);
  const today = localTodayISO();

  return (
    <AuthGuard>
      <main className="max-w-4xl mx-auto p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Practice</h1>
            <p className="text-sm text-gray-600">
              Choose a date. Filter by GS paper and subject.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">GS:</span>
              <select className="w-auto" value={gs} onChange={(e) => setGs(e.target.value as GsFilter)}>
                {GS_OPTIONS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Subject:</span>
              <select className="w-auto" value={subject} onChange={(e) => setSubject(e.target.value as SubjectFilter)}>
                {SUBJECTS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <Link className="btn btn-primary" href={`/day/${today}?gs=${gs}&subject=${encodeURIComponent(subject)}`}>
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
              href={`/day/${s.date}?gs=${gs}&subject=${encodeURIComponent(subject)}`}
              className="block card card-body hover:bg-gray-50 transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">{s.date}</div>
                  <div className="text-sm text-gray-600">
                    Open practice ({gs === "All" ? "All GS" : gs}
                    {subject !== "All" ? ` • ${subject}` : ""})
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