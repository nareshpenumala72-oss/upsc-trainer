"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type AttemptRow = {
  mcq_id: string;
  is_correct: boolean;
};

type MCQMini = { id: string; gs_paper: string | null };

type Stat = {
  gs: "GS1" | "GS2" | "GS3" | "GS4" | "Unknown";
  attempted: number;
  correct: number;
  accuracy: number;
};

export default function ProgressPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stat[]>([]);
  const [weakest, setWeakest] = useState<Stat | null>(null);

  useEffect(() => setMounted(true), []);

  // auth
  useEffect(() => {
    if (!mounted) return;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }
      setCheckingAuth(false);
    })();
  }, [mounted, router]);

  useEffect(() => {
    if (!mounted || checkingAuth) return;

    (async () => {
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) {
        setLoading(false);
        return;
      }

      // Fetch all attempts (you can add pagination later)
      const { data: aData, error: aErr } = await supabase
        .from("mcq_attempts")
        .select("mcq_id,is_correct")
        .eq("user_id", userId);

      if (aErr) {
        setStats([]);
        setWeakest(null);
        setLoading(false);
        return;
      }

      const attempts = (aData || []) as AttemptRow[];
      const mcqIds = Array.from(new Set(attempts.map((a) => a.mcq_id)));

      // Map MCQ -> gs_paper
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

      // Aggregate
      const bucket: Record<string, { attempted: number; correct: number }> = {};
      function key(gs: string | null) {
        return gs || "Unknown";
      }

      for (const a of attempts) {
        const gs = key(mcqMap[a.mcq_id]?.gs_paper ?? null);
        bucket[gs] = bucket[gs] || { attempted: 0, correct: 0 };
        bucket[gs].attempted += 1;
        if (a.is_correct) bucket[gs].correct += 1;
      }

      const result: Stat[] = Object.entries(bucket).map(([k, v]) => ({
        gs: (k as any) || "Unknown",
        attempted: v.attempted,
        correct: v.correct,
        accuracy: v.attempted > 0 ? Math.round((v.correct / v.attempted) * 100) : 0,
      }));

      // Ensure GS1..GS4 always show (even 0)
      const order = ["GS1", "GS2", "GS3", "GS4", "Unknown"];
      const normalized: Stat[] = order.map((g) => {
        const found = result.find((r) => r.gs === g);
        return (
          found || {
            gs: g as any,
            attempted: 0,
            correct: 0,
            accuracy: 0,
          }
        );
      });

      setStats(normalized);

      const candidates = normalized.filter((s) => s.gs !== "Unknown" && s.attempted > 0);
      const w =
        candidates.length === 0
          ? null
          : candidates.reduce((min, cur) => (cur.accuracy < min.accuracy ? cur : min));

      setWeakest(w);

      setLoading(false);
    })();
  }, [mounted, checkingAuth]);

  const overall = useMemo(() => {
    const totalAttempted = stats.reduce((s, x) => s + x.attempted, 0);
    const totalCorrect = stats.reduce((s, x) => s + x.correct, 0);
    const acc = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;
    return { totalAttempted, totalCorrect, acc };
  }, [stats]);

  if (!mounted || checkingAuth) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <div className="card card-body">Loading...</div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto p-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Progress</h1>
          <p className="text-sm text-gray-600">Accuracy by GS paper + weak areas.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link className="btn btn-secondary" href="/dashboard">
            Dashboard
          </Link>
          <Link className="btn btn-secondary" href="/notes">
            Notes
          </Link>
        </div>
      </div>

      {loading && <p>Loading...</p>}

      {!loading && (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="card card-body">
              <div className="text-sm text-gray-500">Total Attempted</div>
              <div className="text-2xl font-bold mt-1">{overall.totalAttempted}</div>
            </div>

            <div className="card card-body">
              <div className="text-sm text-gray-500">Total Correct</div>
              <div className="text-2xl font-bold mt-1">{overall.totalCorrect}</div>
            </div>

            <div className="card card-body">
              <div className="text-sm text-gray-500">Overall Accuracy</div>
              <div className="text-2xl font-bold mt-1">{overall.acc}%</div>
            </div>
          </div>

          <div className="mt-6 card card-body">
            <div className="text-lg font-semibold">GS-wise Accuracy</div>
            <div className="mt-4 space-y-2">
              {stats.map((s) => (
                <div key={s.gs} className="flex items-center justify-between">
                  <div className="text-sm">
                    <b>{s.gs}</b> • {s.correct}/{s.attempted}
                  </div>
                  <div className="text-sm font-semibold">{s.accuracy}%</div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              {weakest ? (
                <div className="text-sm">
                  <b>Weakest GS:</b> {weakest.gs} ({weakest.accuracy}%)
                </div>
              ) : (
                <div className="text-sm text-gray-600">Attempt some MCQs to see weak areas.</div>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}