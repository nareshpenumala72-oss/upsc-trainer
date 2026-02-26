"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AuthGuard from "@/components/AuthGuard";

type DailySet = {
  id: string;
  date: string;
};

export default function ArchivePage() {
  const [sets, setSets] = useState<DailySet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("daily_sets")
        .select("id, date")
        .order("date", { ascending: false });

      setSets(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <AuthGuard>
      <main className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Practice Archive</h1>

        {loading && <p>Loading...</p>}

        {!loading && sets.length === 0 && (
          <p>No practice sets available yet.</p>
        )}

        <div className="space-y-3">
          {sets.map((set) => (
            <Link
              key={set.id}
              href={`/day/${set.date}`}
              className="block bg-white p-4 rounded-xl shadow hover:bg-gray-50 transition"
            >
              📅 {set.date} – Daily Practice
            </Link>
          ))}
        </div>
      </main>
    </AuthGuard>
  );
}