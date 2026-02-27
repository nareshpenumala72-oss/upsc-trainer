"use client";

import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabaseClient";

type GsPaper = "GS1" | "GS2" | "GS3" | "GS4";
const GS_OPTIONS: GsPaper[] = ["GS1", "GS2", "GS3", "GS4"];

function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
}

export default function AdminCurrentAffairsPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [date, setDate] = useState(todayISO());
  const [gsPaper, setGsPaper] = useState<GsPaper>("GS2");

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [gsTags, setGsTags] = useState("GS2 - International Relations");

  async function addCA() {
    setMsg(null);

    if (!date) return setMsg("Date is required.");
    if (!gsPaper) return setMsg("GS Paper is required.");
    if (!title.trim()) return setMsg("Title is required.");
    if (!summary.trim()) return setMsg("Summary is required.");

    setLoading(true);

    const { error } = await supabase.from("current_affairs").insert({
      date,
      gs_paper: gsPaper,
      title,
      summary,
      gs_tags: gsTags.trim() ? gsTags : null,
    });

    setLoading(false);

    if (error) return setMsg("❌ " + error.message);

    setMsg("✅ Current Affairs item added!");

    // reset fields except date and gsPaper
    setTitle("");
    setSummary("");
  }

  return (
    <AuthGuard>
      <AdminGuard>
        <main className="max-w-4xl mx-auto p-6">
          <h1 className="text-2xl font-bold mb-4">Admin: Add Current Affairs</h1>

          {msg && (
            <div className="mb-4 card card-body">
              <p>{msg}</p>
            </div>
          )}

          <div className="card card-body space-y-4">
            {/* Date + GS */}
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600">Date</label>
                <input
                  type="date"
                  className="w-full mt-1"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">GS Paper</label>
                <select
                  className="w-full mt-1"
                  value={gsPaper}
                  onChange={(e) => setGsPaper(e.target.value as GsPaper)}
                >
                  {GS_OPTIONS.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* GS Tags (optional label shown to students) */}
            <div>
              <label className="text-sm text-gray-600">
                GS Tags (optional – what students see)
              </label>
              <input
                className="w-full mt-1"
                value={gsTags}
                onChange={(e) => setGsTags(e.target.value)}
                placeholder="e.g. GS2 - Polity / IR"
              />
            </div>

            {/* Title */}
            <div>
              <label className="text-sm text-gray-600">Title</label>
              <input
                className="w-full mt-1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter headline / topic title"
              />
            </div>

            {/* Summary */}
            <div>
              <label className="text-sm text-gray-600">Summary</label>
              <textarea
                className="w-full mt-1"
                rows={5}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Write short UPSC-style summary..."
              />
            </div>

            <button className="btn btn-primary" onClick={addCA} disabled={loading}>
              {loading ? "Saving..." : "Add Current Affairs"}
            </button>

            <div className="text-sm text-gray-600">
              Tip: Add multiple CA items for the same date (Insights-style).
            </div>
          </div>
        </main>
      </AdminGuard>
    </AuthGuard>
  );
}