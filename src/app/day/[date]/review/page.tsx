"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AuthGuard from "@/components/AuthGuard";
import Link from "next/link";

export default function ReviewPage() {
  const params = useParams<{ date: string }>();
  const date = params.date;

  const [locked, setLocked] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setMsg(null);

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return;

      const { data: ds, error: dsErr } = await supabase
        .from("daily_sets")
        .select("id")
        .eq("date", date)
        .single();

      if (dsErr || !ds) {
        setMsg("No daily set found for this date.");
        return;
      }

      const { data: sub } = await supabase
        .from("daily_mcq_submissions")
        .select("id")
        .eq("user_id", userId)
        .eq("daily_set_id", ds.id)
        .maybeSingle();

      if (!sub) {
        setLocked(true);
        return;
      }
      setLocked(false);

      const { data: attempts, error: aErr } = await supabase
        .from("mcq_attempts")
        .select("mcq_id, selected_option, is_correct")
        .eq("user_id", userId)
        .eq("daily_set_id", ds.id);

      if (aErr) return setMsg(aErr.message);

      const ids = (attempts ?? []).map((a) => a.mcq_id);

      const { data: mcqs, error: qErr } = await supabase
        .from("mcqs")
        .select("id, question, correct_option, explanation")
        .in("id", ids);

      if (qErr) return setMsg(qErr.message);

      const map = new Map((mcqs ?? []).map((q: any) => [q.id, q]));

      setRows(
        (attempts ?? []).map((a) => ({
          ...a,
          mcq: map.get(a.mcq_id),
        }))
      );
    })();
  }, [date]);

  return (
    <AuthGuard>
      <main className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold">Review: {date}</h1>
        {msg && <p className="mt-3 text-red-600">{msg}</p>}

        {locked ? (
          <div className="mt-6">
            <p>Explanations are locked. Submit MCQs to unlock review.</p>
            <Link className="underline" href={`/day/${date}`}>
              Go back
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {rows.map((r, idx) => (
              <div key={r.mcq_id} className="bg-white p-4 rounded-xl shadow">
                <div className="font-semibold">
                  Q{idx + 1}. {r.mcq?.question}
                </div>

                <p className="mt-2">
                  Your answer: <b>{r.selected_option}</b> | Correct:{" "}
                  <b>{r.mcq?.correct_option}</b>{" "}
                  {r.is_correct ? "✅" : "❌"}
                </p>

                <div className="mt-3">
                  <b>Explanation:</b>
                  <p className="mt-1">{r.mcq?.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </AuthGuard>
  );
}