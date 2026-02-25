"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AdminGuard from "@/components/AdminGuard";

export default function AdminMcqsPage() {
  const [question, setQuestion] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correct, setCorrect] = useState("A");
  const [explanation, setExplanation] = useState("");
  const [tags, setTags] = useState("Polity");
  const [difficulty, setDifficulty] = useState("medium");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const tagArray = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const { error } = await supabase.from("mcqs").insert({
      question,
      option_a: optionA,
      option_b: optionB,
      option_c: optionC,
      option_d: optionD,
      correct_option: correct,
      explanation,
      tags: tagArray,
      difficulty,
    });

    if (error) {
     setMessage("❌ " + JSON.stringify(error, null, 2));
      return;
    }

    setMessage("✅ MCQ Saved Successfully!");

    setQuestion("");
    setOptionA("");
    setOptionB("");
    setOptionC("");
    setOptionD("");
    setExplanation("");
  }

  return (
    <AdminGuard>
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Add MCQ</h1>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 bg-white p-6 rounded-xl shadow"
        >
          <div>
            <label className="font-medium">Question</label>
            <textarea
              className="w-full border p-2 rounded mt-1"
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Option A"
              className="border p-2 rounded"
              value={optionA}
              onChange={(e) => setOptionA(e.target.value)}
              required
            />
            <input
              placeholder="Option B"
              className="border p-2 rounded"
              value={optionB}
              onChange={(e) => setOptionB(e.target.value)}
              required
            />
            <input
              placeholder="Option C"
              className="border p-2 rounded"
              value={optionC}
              onChange={(e) => setOptionC(e.target.value)}
              required
            />
            <input
              placeholder="Option D"
              className="border p-2 rounded"
              value={optionD}
              onChange={(e) => setOptionD(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <select
              className="border p-2 rounded"
              value={correct}
              onChange={(e) => setCorrect(e.target.value)}
            >
              <option value="A">Correct: A</option>
              <option value="B">Correct: B</option>
              <option value="C">Correct: C</option>
              <option value="D">Correct: D</option>
            </select>

            <select
              className="border p-2 rounded"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </select>

            <input
              placeholder="Tags (Polity, Economy)"
              className="border p-2 rounded"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div>
            <label className="font-medium">Explanation</label>
            <textarea
              className="w-full border p-2 rounded mt-1"
              rows={4}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              required
            />
          </div>

          <button className="bg-black text-white px-4 py-2 rounded">
            Save MCQ
          </button>

{message && (
  <pre className="mt-3 text-sm whitespace-pre-wrap bg-gray-100 p-3 rounded">
    {message}
  </pre>
)}        </form>
      </main>
    </AdminGuard>
  );
}