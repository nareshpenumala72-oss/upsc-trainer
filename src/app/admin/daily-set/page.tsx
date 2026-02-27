"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabaseClient";

function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
}

type MCQ = {
  id: string;
  question: string;
  gs_paper: string | null;
};

type Mains = {
  id: string;
  question: string;
  gs_paper: string | null;
};

export default function AdminDailySetPage() {
  const [date, setDate] = useState(todayISO());
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [mains, setMains] = useState<Mains[]>([]);

  const [selectedMcqs, setSelectedMcqs] = useState<string[]>([]);
  const [selectedMains, setSelectedMains] = useState<string | null>(null);

  // Load available MCQs + Mains
  useEffect(() => {
    (async () => {
      const { data: m1 } = await supabase
        .from("mcqs")
        .select("id,question,gs_paper")
        .order("created_at", { ascending: false });

      const { data: m2 } = await supabase
        .from("mains_questions")
        .select("id,question,gs_paper")
        .order("created_at", { ascending: false });

      setMcqs(m1 || []);
      setMains(m2 || []);
    })();
  }, []);

  async function ensureDailySet(): Promise<string | null> {
    const { data } = await supabase
      .from("daily_sets")
      .select("id")
      .eq("date", date)
      .maybeSingle();

    if (data) return data.id;

    const { data: inserted, error } = await supabase
      .from("daily_sets")
      .insert({ date })
      .select("id")
      .single();

    if (error) {
      setMsg("❌ " + error.message);
      return null;
    }

    return inserted.id;
  }

  async function publishSet() {
    setMsg(null);
    if (selectedMcqs.length === 0 && !selectedMains)
      return setMsg("Select at least one MCQ or one Mains.");

    setLoading(true);

    const dailySetId = await ensureDailySet();
    if (!dailySetId) {
      setLoading(false);
      return;
    }

    // Delete existing items for date (overwrite mode)
    await supabase.from("daily_set_items").delete().eq("daily_set_id", dailySetId);

    const rows: any[] = [];

    selectedMcqs.forEach((id) => {
      rows.push({
        daily_set_id: dailySetId,
        item_type: "mcq",
        item_id: id,
      });
    });

    if (selectedMains) {
      rows.push({
        daily_set_id: dailySetId,
        item_type: "mains",
        item_id: selectedMains,
      });
    }

    const { error } = await supabase.from("daily_set_items").insert(rows);

    setLoading(false);

    if (error) return setMsg("❌ " + error.message);

    setMsg("✅ Daily set published!");
  }

  async function clonePreviousDay() {
    setMsg(null);
    setLoading(true);

    // Find previous available daily set
    const { data: sets } = await supabase
      .from("daily_sets")
      .select("id,date")
      .lt("date", date)
      .order("date", { ascending: false })
      .limit(1);

    if (!sets || sets.length === 0) {
      setLoading(false);
      return setMsg("No previous daily set found.");
    }

    const previousSet = sets[0];

    const { data: items } = await supabase
      .from("daily_set_items")
      .select("item_type,item_id")
      .eq("daily_set_id", previousSet.id);

    if (!items || items.length === 0) {
      setLoading(false);
      return setMsg("Previous set has no items.");
    }

    const newSetId = await ensureDailySet();
    if (!newSetId) {
      setLoading(false);
      return;
    }

    await supabase.from("daily_set_items").delete().eq("daily_set_id", newSetId);

    const cloned = items.map((x) => ({
      daily_set_id: newSetId,
      item_type: x.item_type,
      item_id: x.item_id,
    }));

    await supabase.from("daily_set_items").insert(cloned);

    setLoading(false);
    setMsg("🔥 Cloned previous day successfully!");
  }

  return (
    <AuthGuard>
      <AdminGuard>
        <main className="max-w-5xl mx-auto p-6">
          <h1 className="text-2xl font-bold mb-4">Admin: Daily Set Builder</h1>

          {msg && <div className="card card-body mb-4">{msg}</div>}

          <div className="card card-body mb-6 space-y-4">
            <div className="flex gap-3 items-end">
              <div>
                <label className="text-sm text-gray-600">Date</label>
                <input
                  type="date"
                  className="mt-1"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <button
                className="btn btn-secondary"
                onClick={clonePreviousDay}
                disabled={loading}
              >
                🔥 Clone Previous Day
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* MCQs */}
            <div className="card card-body">
              <h2 className="font-semibold mb-3">Select MCQs</h2>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {mcqs.map((q) => (
                  <label key={q.id} className="flex gap-2 items-start">
                    <input
                      type="checkbox"
                      checked={selectedMcqs.includes(q.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMcqs([...selectedMcqs, q.id]);
                        } else {
                          setSelectedMcqs(
                            selectedMcqs.filter((x) => x !== q.id)
                          );
                        }
                      }}
                    />
                    <span className="text-sm">
                      [{q.gs_paper}] {q.question}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Mains */}
            <div className="card card-body">
              <h2 className="font-semibold mb-3">Select Mains Question</h2>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {mains.map((m) => (
                  <label key={m.id} className="flex gap-2 items-start">
                    <input
                      type="radio"
                      name="mains"
                      checked={selectedMains === m.id}
                      onChange={() => setSelectedMains(m.id)}
                    />
                    <span className="text-sm">
                      [{m.gs_paper}] {m.question}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button
              className="btn btn-primary"
              onClick={publishSet}
              disabled={loading}
            >
              {loading ? "Publishing..." : "Publish Daily Set"}
            </button>
          </div>
        </main>
      </AdminGuard>
    </AuthGuard>
  );
}