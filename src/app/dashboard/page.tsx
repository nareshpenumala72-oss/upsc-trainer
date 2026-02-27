"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";

type AttemptRow = { mcq_id: string; is_correct: boolean };
type MCQMini = { id: string; gs_paper: string | null };

type Stat = {
  gs: "GS1" | "GS2" | "GS3" | "GS4" | "Unknown";
  attempted: number;
  correct: number;
  accuracy: number;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);

  const [totalAttempts, setTotalAttempts] = useState(0);
  const [mainsCount, setMainsCount] = useState(0);
  const [accuracy, setAccuracy] = useState(0);

  const [gsStats, setGsStats] = useState<Stat[]>([]);
  const [weakest, setWeakest] = useState<Stat | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) {
        setLoading(false);
        return;
      }

      const { data: aData } = await supabase
        .from("mcq_attempts")
        .select("mcq_id,is_correct")
        .eq("user_id", userId);

      const attempts = (aData || []) as AttemptRow[];
      const total = attempts.length;
      const correct = attempts.filter((x) => x.is_correct).length;

      setTotalAttempts(total);
      setAccuracy(total > 0 ? Math.round((correct / total) * 100) : 0);

      const { count } = await supabase
        .from("mains_submissions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      setMainsCount(count || 0);

      const mcqIds = Array.from(new Set(attempts.map((a) => a.mcq_id)));
      let mcqMap: Record<string, MCQMini> = {};

      if (mcqIds.length > 0) {
        const { data: mData } = await supabase
          .from("mcqs")
          .select("id,gs_paper")
          .in("id", mcqIds);

        (mData || []).forEach((m: any) => {
          mcqMap[m.id] = { id: m.id, gs_paper: m.gs_paper ?? null };
        });
      }

      const bucket: Record<string, { attempted: number; correct: number }> = {};
      const key = (gs: string | null) => gs || "Unknown";

      for (const a of attempts) {
        const gs = key(mcqMap[a.mcq_id]?.gs_paper ?? null);
        bucket[gs] = bucket[gs] || { attempted: 0, correct: 0 };
        bucket[gs].attempted += 1;
        if (a.is_correct) bucket[gs].correct += 1;
      }

      const order = ["GS1", "GS2", "GS3", "GS4", "Unknown"];
      const normalized: Stat[] = order.map((g) => {
        const v = bucket[g] || { attempted: 0, correct: 0 };
        return {
          gs: g as any,
          attempted: v.attempted,
          correct: v.correct,
          accuracy: v.attempted > 0 ? Math.round((v.correct / v.attempted) * 100) : 0,
        };
      });

      setGsStats(normalized);

      const candidates = normalized.filter((s) => s.gs !== "Unknown" && s.attempted > 0);
      const w =
        candidates.length === 0
          ? null
          : candidates.reduce((min, cur) => (cur.accuracy < min.accuracy ? cur : min));
      setWeakest(w);

      setLoading(false);
    })();
  }, []);

  const gsMini = useMemo(() => gsStats.filter((x) => x.gs !== "Unknown"), [gsStats]);

  return (
    <AuthGuard>
      <main className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">My Dashboard</h1>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl shadow">
                <h2 className="text-lg font-semibold">Total MCQs Attempted</h2>
                <p className="text-2xl mt-2">{totalAttempts}</p>
              </div>

              <div className="bg-white p-4 rounded-xl shadow">
                <h2 className="text-lg font-semibold">Accuracy</h2>
                <p className="text-2xl mt-2">{accuracy}%</p>
              </div>

              <div className="bg-white p-4 rounded-xl shadow">
                <h2 className="text-lg font-semibold">Mains Answers Written</h2>
                <p className="text-2xl mt-2">{mainsCount}</p>
              </div>
            </div>

            <div className="mt-8 grid md:grid-cols-2 gap-4">
              <Link className="card card-body hover:bg-gray-50 transition" href="/practice">
                <div className="text-lg font-semibold">📝 Practice</div>
                <div className="text-sm text-gray-600">Choose a date and attempt questions</div>
              </Link>

              <Link className="card card-body hover:bg-gray-50 transition" href="/current-affairs">
                <div className="text-lg font-semibold">🗞️ Current Affairs</div>
                <div className="text-sm text-gray-600">Browse date-wise CA with GS filters</div>
              </Link>

              <Link className="card card-body hover:bg-gray-50 transition" href="/notes">
                <div className="text-lg font-semibold">📌 Notes</div>
                <div className="text-sm text-gray-600">View your saved takeaways</div>
              </Link>

              <Link className="card card-body hover:bg-gray-50 transition" href="/progress">
                <div className="text-lg font-semibold">📊 Progress</div>
                <div className="text-sm text-gray-600">GS-wise accuracy and weak areas</div>
              </Link>
            </div>

            <div className="mt-8 card card-body">
              <div className="text-lg font-semibold">GS-wise Snapshot</div>

              <div className="mt-3 space-y-2">
                {gsMini.map((s) => (
                  <div key={s.gs} className="flex items-center justify-between">
                    <div className="text-sm">
                      <b>{s.gs}</b> • {s.correct}/{s.attempted}
                    </div>
                    <div className="text-sm font-semibold">{s.accuracy}%</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-sm">
                {weakest ? (
                  <>
                    <b>Weakest GS right now:</b> {weakest.gs} ({weakest.accuracy}%)
                    <span className="text-gray-600"> — focus practice on {weakest.gs}.</span>
                  </>
                ) : (
                  <span className="text-gray-600">Attempt some MCQs to see weak areas.</span>
                )}
              </div>
            </div>

            {weakest && (
              <div className="mt-6 card card-body bg-yellow-50">
                <div className="font-semibold">🎯 Suggested Focus: {weakest.gs}</div>
                <p className="text-sm mt-2">
                  Your accuracy is lowest in {weakest.gs}. Practice more from this paper to improve.
                </p>

                <Link
                  href={`/practice?gs=${weakest.gs}`}
                  className="btn btn-primary mt-3"
                >
                  Practice {weakest.gs}
                </Link>
              </div>
            )}
          </>
        )}
      </main>
    </AuthGuard>
  );
}