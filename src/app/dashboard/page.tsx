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

      // MCQ attempts
      const { data: attempts } = await supabase
        .from("mcq_attempts")
        .select("is_correct")
        .eq("user_id", userId);

      const totalAttempts = attempts?.length || 0;
      const correct = attempts?.filter((a) => a.is_correct).length || 0;

      // Mains submissions
      const { data: mains } = await supabase
        .from("mains_submissions")
        .select("id")
        .eq("user_id", userId);

      setStats({
        totalAttempts,
        correct,
        mainsCount: mains?.length || 0,
      });

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
      </main>
    </AuthGuard>
  );
}