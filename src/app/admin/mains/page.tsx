"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AdminGuard from "@/components/AdminGuard";

export default function AdminMainsPage() {
  const [question, setQuestion] = useState("");
  const [demand, setDemand] = useState("");
  const [keywords, setKeywords] = useState("GS2, governance");
  const [intro, setIntro] = useState("");
  const [body, setBody] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [valueAdd, setValueAdd] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    const kw = keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    const { error } = await supabase.from("mains_questions").insert({
      question,
      demand,
      keywords: kw,
      structure_intro: intro,
      structure_body: body,
      structure_conclusion: conclusion,
      value_add: valueAdd,
    });

    if (error) return setMsg("❌ " + error.message);

    setMsg("✅ Mains question saved!");
    setQuestion("");
    setDemand("");
    setIntro("");
    setBody("");
    setConclusion("");
    setValueAdd("");
  }

  return (
    <AdminGuard>
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold">Admin • Add Mains Question</h1>

        <form
          onSubmit={save}
          className="mt-6 space-y-4 bg-white p-5 rounded-xl shadow"
        >
          <div>
            <label className="block text-sm font-medium">Question</label>
            <textarea
              className="mt-1 w-full border rounded-lg p-2"
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Demand</label>
            <input
              className="mt-1 w-full border rounded-lg p-2"
              value={demand}
              onChange={(e) => setDemand(e.target.value)}
              placeholder="What examiner is asking"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Keywords (comma)</label>
            <input
              className="mt-1 w-full border rounded-lg p-2"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="GS2, governance, federalism"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Structure • Intro</label>
            <textarea
              className="mt-1 w-full border rounded-lg p-2"
              rows={2}
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Structure • Body</label>
            <textarea
              className="mt-1 w-full border rounded-lg p-2"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Headings / bullet plan"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">
              Structure • Conclusion
            </label>
            <textarea
              className="mt-1 w-full border rounded-lg p-2"
              rows={2}
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Value Add</label>
            <textarea
              className="mt-1 w-full border rounded-lg p-2"
              rows={3}
              value={valueAdd}
              onChange={(e) => setValueAdd(e.target.value)}
              placeholder="data/examples/schemes/case studies"
            />
          </div>

          <button className="bg-black text-white px-4 py-2 rounded-lg">
            Save Mains Question
          </button>

          {msg && <p className="text-sm mt-2">{msg}</p>}
        </form>
      </main>
    </AdminGuard>
  );
}