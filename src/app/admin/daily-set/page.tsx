"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AdminGuard from "@/components/AdminGuard";

type MCQ = { id: string; question: string };
type MainsQ = { id: string; question: string };

export default function AdminDailySetPage() {
  const [date, setDate] = useState("");
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [mains, setMains] = useState<MainsQ[]>([]);
  const [selectedMcqs, setSelectedMcqs] = useState<string[]>([]);
  const [selectedMainsId, setSelectedMainsId] = useState<string>("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setDate(today);
    fetchAll();
  }, []);

  async function fetchAll() {
    const { data: mcqData } = await supabase
      .from("mcqs")
      .select("id, question")
      .order("created_at", { ascending: false });

    const { data: mainsData } = await supabase
      .from("mains_questions")
      .select("id, question")
      .order("created_at", { ascending: false });

    setMcqs(mcqData || []);
    setMains(mainsData || []);
  }

  function toggleMcq(id: string) {
    setSelectedMcqs((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function createDailySet() {
    setMessage("");

    if (selectedMcqs.length === 0) {
      setMessage("❌ Select at least 1 MCQ.");
      return;
    }
    if (!selectedMainsId) {
      setMessage("❌ Select 1 Mains question.");
      return;
    }

    // create or fetch daily set (if already exists)
    const { data: existing } = await supabase
      .from("daily_sets")
      .select("id")
      .eq("date", date)
      .maybeSingle();

    let dailySetId = existing?.id as string | undefined;

    if (!dailySetId) {
      const { data: created, error: createErr } = await supabase
        .from("daily_sets")
        .insert({ date })
        .select("id")
        .single();

      if (createErr) {
        setMessage("❌ " + createErr.message);
        return;
      }
      dailySetId = created.id;
    } else {
      // optional: clear existing items for that day to avoid duplicates
      await supabase.from("daily_set_items").delete().eq("daily_set_id", dailySetId);
    }

    const items = [
      ...selectedMcqs.map((mcqId) => ({
        daily_set_id: dailySetId,
        item_type: "mcq",
        item_id: mcqId,
      })),
      {
        daily_set_id: dailySetId,
        item_type: "mains",
        item_id: selectedMainsId,
      },
    ];

    const { error: itemError } = await supabase.from("daily_set_items").insert(items);
    if (itemError) {
      setMessage("❌ " + itemError.message);
      return;
    }

    setMessage("✅ Daily Set created with MCQs + Mains!");
  }

  return (
    <AdminGuard>
      <main className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold">Admin • Create Daily Set</h1>

        <div className="mt-4 flex items-center gap-3">
          <label className="font-medium">Date</label>
          <input
            type="date"
            className="border p-2 rounded"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button
            onClick={fetchAll}
            className="border px-3 py-2 rounded"
          >
            Refresh lists
          </button>
        </div>

        <div className="mt-6 bg-white p-4 rounded-xl shadow">
          <h2 className="font-semibold mb-2">Select MCQs</h2>
          <div className="space-y-2">
            {mcqs.map((q) => (
              <label key={q.id} className="flex gap-2 items-start">
                <input
                  type="checkbox"
                  checked={selectedMcqs.includes(q.id)}
                  onChange={() => toggleMcq(q.id)}
                />
                <span>{q.question}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-6 bg-white p-4 rounded-xl shadow">
          <h2 className="font-semibold mb-2">Select 1 Mains Question</h2>
          <select
            className="w-full border rounded p-2"
            value={selectedMainsId}
            onChange={(e) => setSelectedMainsId(e.target.value)}
          >
            <option value="">-- Select --</option>
            {mains.map((m) => (
              <option key={m.id} value={m.id}>
                {m.question.slice(0, 120)}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={createDailySet}
          className="mt-6 bg-black text-white px-4 py-2 rounded"
        >
          Create Daily Set
        </button>

        {message && <p className="mt-3">{message}</p>}
      </main>
    </AdminGuard>
  );
}