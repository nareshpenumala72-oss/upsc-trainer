const [streak, setStreak] = useState(0);
const [lastPractice, setLastPractice] = useState<string | null>(null);

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AuthGuard from "@/components/AuthGuard";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalAttempts: 0,
    correct: 0,
    mainsCount: 0,
  });

  const [loading, setLoading] = useState(true);

useEffect(() => {
  (async () => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return;

    // Fetch MCQ attempts
    const { data: attempts } = await supabase
      .from("daily_mcq_submissions")
      .select("daily_set_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const { data: mcqAttempts } = await supabase
      .from("mcq_attempts")
      .select("is_correct")
      .eq("user_id", userId);

    const totalAttempts = mcqAttempts?.length || 0;
    const correct =
      mcqAttempts?.filter((a) => a.is_correct).length || 0;

    const { data: mains } = await supabase
      .from("mains_submissions")
      .select("id")
      .eq("user_id", userId);

    // Calculate streak
    let streak = 0;
    let lastDate: string | null = null;

    if (attempts && attempts.length > 0) {
      const dates = attempts.map((a) =>
        new Date(a.created_at).toISOString().split("T")[0]
      );

      const uniqueDates = [...new Set(dates)].sort().reverse();

      const today = new Date();
      let current = new Date(today);

      for (let dateStr of uniqueDates) {
        const attemptDate = new Date(dateStr);

        if (
          current.toISOString().split("T")[0] ===
          attemptDate.toISOString().split("T")[0]
        ) {
          streak++;
          current.setDate(current.getDate() - 1);
        } else {
          break;
        }
      }

      lastDate = uniqueDates[0];
    }

    setStats({
      totalAttempts,
      correct,
      mainsCount: mains?.length || 0,
    });

    setStreak(streak);
    setLastPractice(lastDate);

    setLoading(false);
  })();
}, []);

  if (loading) return <div className="p-6">Loading dashboard...</div>;

  const accuracy =
    stats.totalAttempts > 0
      ? ((stats.correct / stats.totalAttempts) * 100).toFixed(1)
      : 0;

 return (
  <AuthGuard>
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">My Dashboard</h1>

      {/* 3 Stat Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="text-lg font-semibold">Total MCQs Attempted</h2>
          <p className="text-2xl mt-2">{stats.totalAttempts}</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="text-lg font-semibold">Accuracy</h2>
          <p className="text-2xl mt-2">{accuracy}%</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="text-lg font-semibold">Mains Answers Written</h2>
          <p className="text-2xl mt-2">{stats.mainsCount}</p>
        </div>
      </div>

      {/* Streak Section */}
      <div className="mt-8 grid md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="text-lg font-semibold">🔥 Current Streak</h2>
          <p className="text-2xl mt-2">{streak} days</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="text-lg font-semibold">Last Practice</h2>
          <p className="text-2xl mt-2">
            {lastPractice ? lastPractice : "No practice yet"}
          </p>
        </div>
      </div>

    </main>
  </AuthGuard>
);