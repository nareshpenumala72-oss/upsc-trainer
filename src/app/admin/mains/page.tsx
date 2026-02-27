"use client";

import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabaseClient";

type GsPaper = "GS1" | "GS2" | "GS3" | "GS4";
const GS_OPTIONS: GsPaper[] = ["GS1", "GS2", "GS3", "GS4"];

function parseKeywords(input: string): string[] {
  const arr = input
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return arr;
}

export default function AdminMainsPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [gsPaper, setGsPaper] = useState<GsPaper>("GS2");
  const [question, setQuestion] = useState("");
  const [demand, setDemand] = useState("");
  const [keywords, setKeywords] = useState(""); // comma separated

  const [intro, setIntro] = useState("");
  const [body, setBody] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [valueAdd, setValueAdd] = useState("");

  async function addMains() {
    setMsg(null);

    if (!question.trim()) return setMsg("Question is required.");
    if (!gsPaper) return setMsg("GS Paper is required.");

    setLoading(true);

    const { error } = await supabase.from("mains_questions").insert({
      gs_paper: gsPaper,
      question,
      demand: demand.trim() ? demand : null,
      keywords: keywords.trim() ? parseKeywords(keywords) : null,
      structure_intro: intro.trim() ? intro : null,
      structure_body: body.trim() ? body : null,
      structure_conclusion: conclusion.trim() ? conclusion : null,
      value_add: valueAdd.trim() ? valueAdd : null,
    });

    setLoading(false);

    if (error) return setMsg("❌ " + error.message);

    setMsg("✅ Mains question added successfully!");

    // reset
    setGsPaper("GS2");
    setQuestion("");
    setDemand("");
    setKeywords("");
    setIntro("");
    setBody("");
    setConclusion("");
    setValueAdd("");
  }

  return (
    <AuthGuard>
      <AdminGuard>
        <main className="max-w-4xl mx-auto p-6">
          <h1 className="text-2xl font-bold mb-4">Admin: Add Mains Question</h1>

          {msg && (
            <div className="mb-4 card card-body">
              <p>{msg}</p>
            </div>
          )}

          <div className="card card-body space-y-4">
            {/* GS Paper */}
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

            {/* Question */}
            <div>
              <label className="text-sm text-gray-600">Question</label>
              <textarea
                className="w-full mt-1"
                rows={4}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Enter mains question..."
              />
            </div>

            {/* Demand */}
            <div>
              <label className="text-sm text-gray-600">Demand (optional)</label>
              <textarea
                className="w-full mt-1"
                rows={2}
                value={demand}
                onChange={(e) => setDemand(e.target.value)}
                placeholder="What exactly the examiner is asking..."
              />
            </div>

            {/* Keywords */}
            <div>
              <label className="text-sm text-gray-600">
                Keywords (optional, comma separated)
              </label>
              <input
                className="w-full mt-1"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g. federalism, cooperative, finance commission"
              />
            </div>

            <hr />

            {/* Model structure hints */}
            <div className="grid gap-3">
              <div>
                <label className="text-sm text-gray-600">Intro Hint (optional)</label>
                <textarea
                  className="w-full mt-1"
                  rows={2}
                  value={intro}
                  onChange={(e) => setIntro(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Body Hint (optional)</label>
                <textarea
                  className="w-full mt-1"
                  rows={3}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Conclusion Hint (optional)</label>
                <textarea
                  className="w-full mt-1"
                  rows={2}
                  value={conclusion}
                  onChange={(e) => setConclusion(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Value Add (optional)</label>
                <textarea
                  className="w-full mt-1"
                  rows={2}
                  value={valueAdd}
                  onChange={(e) => setValueAdd(e.target.value)}
                />
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={addMains}
              disabled={loading}
            >
              {loading ? "Saving..." : "Add Mains Question"}
            </button>
          </div>
        </main>
      </AdminGuard>
    </AuthGuard>
  );
}