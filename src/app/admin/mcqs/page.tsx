"use client";

import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabaseClient";

type GsPaper = "GS1" | "GS2" | "GS3" | "GS4";
const GS_OPTIONS: GsPaper[] = ["GS1", "GS2", "GS3", "GS4"];

export default function AdminMCQsPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [gsPaper, setGsPaper] = useState<GsPaper>("GS2");
  const [question, setQuestion] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correct, setCorrect] = useState<"A" | "B" | "C" | "D">("A");
  const [explanation, setExplanation] = useState("");

  async function addMCQ() {
    setMsg(null);

    if (!question.trim()) return setMsg("Question is required.");
    if (!optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim())
      return setMsg("All 4 options are required.");
    if (!explanation.trim()) return setMsg("Explanation is required.");
    if (!gsPaper) return setMsg("GS Paper is required.");

    setLoading(true);

    const { error } = await supabase.from("mcqs").insert({
      gs_paper: gsPaper,
      question,
      option_a: optionA,
      option_b: optionB,
      option_c: optionC,
      option_d: optionD,
      correct_option: correct,
      explanation,
    });

    setLoading(false);

    if (error) return setMsg("❌ " + error.message);

    setMsg("✅ MCQ added successfully!");

    // reset
    setQuestion("");
    setOptionA("");
    setOptionB("");
    setOptionC("");
    setOptionD("");
    setCorrect("A");
    setExplanation("");
    setGsPaper("GS2");
  }

  return (
    <AuthGuard>
      <AdminGuard>
        <main className="max-w-4xl mx-auto p-6">
          <h1 className="text-2xl font-bold mb-4">Admin: Add MCQ</h1>

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
                placeholder="Enter MCQ question..."
              />
            </div>

            {/* Options */}
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600">Option A</label>
                <input
                  className="w-full mt-1"
                  value={optionA}
                  onChange={(e) => setOptionA(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Option B</label>
                <input
                  className="w-full mt-1"
                  value={optionB}
                  onChange={(e) => setOptionB(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Option C</label>
                <input
                  className="w-full mt-1"
                  value={optionC}
                  onChange={(e) => setOptionC(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Option D</label>
                <input
                  className="w-full mt-1"
                  value={optionD}
                  onChange={(e) => setOptionD(e.target.value)}
                />
              </div>
            </div>

            {/* Correct option */}
            <div>
              <label className="text-sm text-gray-600">Correct Option</label>
              <select
                className="w-full mt-1"
                value={correct}
                onChange={(e) => setCorrect(e.target.value as any)}
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>

            {/* Explanation */}
            <div>
              <label className="text-sm text-gray-600">Explanation</label>
              <textarea
                className="w-full mt-1"
                rows={4}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Enter explanation..."
              />
            </div>

            <button
              className="btn btn-primary"
              onClick={addMCQ}
              disabled={loading}
            >
              {loading ? "Saving..." : "Add MCQ"}
            </button>
          </div>
        </main>
      </AdminGuard>
    </AuthGuard>
  );
}