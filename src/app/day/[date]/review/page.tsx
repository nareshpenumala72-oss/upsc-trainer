"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";

type GsFilter = "All" | "GS1" | "GS2" | "GS3" | "GS4";
const GS_OPTIONS: GsFilter[] = ["All", "GS1", "GS2", "GS3", "GS4"];

type MCQ = {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  explanation: string;
  gs_paper: string | null;
};

type Attempt = {
  mcq_id: string;
  selected_option: "A" | "B" | "C" | "D";
  is_correct: boolean;
};

export default function ReviewPage() {
  const params = useParams<{ date: string }>();
  const date = params.date;

  const router = useRouter();
  const searchParams = useSearchParams();

  const qsGs = (searchParams.get("gs") || "All") as GsFilter;
  const [gs, setGs] = useState<GsFilter>(GS_OPTIONS.includes(qsGs) ? qsGs : "All");

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [dailySetId, setDailySetId] = useState<string | null>(null);

  const [submitted, setSubmitted] = useState(false);
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [attempts, setAttempts] = useState<Record<string, Attempt>>({});

  // notes UI
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [noteStatus, setNoteStatus] = useState<Record<string, string>>({});

  // Keep URL synced with gs
  useEffect(() => {
    router.replace(`/day/${date}/review?gs=${gs}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gs]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg(null);

      // auth
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) {
        setMsg("Please login.");
        setLoading(false);
        return;
      }

      // daily set id
      const { data: ds, error: dsErr } = await supabase
        .from("daily_sets")
        .select("id")
        .eq("date", date)
        .maybeSingle();

      if (dsErr) {
        setMsg(dsErr.message);
        setLoading(false);
        return;
      }
      if (!ds) {
        setMsg(`No daily set for ${date}`);
        setLoading(false);
        return;
      }
      setDailySetId(ds.id);

      // submitted?
      const { data: sub } = await supabase
        .from("daily_mcq_submissions")
        .select("id")
        .eq("user_id", userId)
        .eq("daily_set_id", ds.id)
        .maybeSingle();

      const isSubmitted = !!sub;
      setSubmitted(isSubmitted);

      if (!isSubmitted) {
        setMcqs([]);
        setAttempts({});
        setLoading(false);
        return;
      }

      // get mcq ids for that daily set
      const { data: items, error: itErr } = await supabase
        .from("daily_set_items")
        .select("item_type, item_id")
        .eq("daily_set_id", ds.id);

      if (itErr) {
        setMsg(itErr.message);
        setLoading(false);
        return;
      }

      const mcqIds = (items ?? [])
        .filter((x) => x.item_type === "mcq")
        .map((x) => x.item_id);

      if (mcqIds.length === 0) {
        setMcqs([]);
        setAttempts({});
        setLoading(false);
        return;
      }

      // fetch mcqs and apply GS filter
      const { data: qData, error: qErr } = await supabase
        .from("mcqs")
        .select(
          "id,question,option_a,option_b,option_c,option_d,correct_option,explanation,gs_paper"
        )
        .in("id", mcqIds);

      if (qErr) {
        setMsg(qErr.message);
        setLoading(false);
        return;
      }

      const map = new Map((qData || []).map((q: any) => [q.id, q]));
      const ordered = mcqIds.map((id) => map.get(id)).filter(Boolean) as MCQ[];

      const filtered = gs === "All" ? ordered : ordered.filter((q) => q.gs_paper === gs);
      setMcqs(filtered);

      // attempts for this user + daily set (for all mcqs in set)
      const { data: aData, error: aErr } = await supabase
        .from("mcq_attempts")
        .select("mcq_id, selected_option, is_correct")
        .eq("user_id", userId)
        .eq("daily_set_id", ds.id);

      if (aErr) {
        setMsg(aErr.message);
        setLoading(false);
        return;
      }

      const atMap: Record<string, Attempt> = {};
      (aData || []).forEach((a: any) => {
        atMap[a.mcq_id] = a;
      });
      setAttempts(atMap);

      setLoading(false);
    })();
  }, [date, gs]);

  const total = mcqs.length;
  const correct = useMemo(() => {
    let c = 0;
    for (const q of mcqs) {
      if (attempts[q.id]?.is_correct) c++;
    }
    return c;
  }, [mcqs, attempts]);

  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  async function saveNote(mcqId: string) {
    setNoteStatus((p) => ({ ...p, [mcqId]: "" }));

    const text = (noteDraft[mcqId] || "").trim();
    if (!text) {
      setNoteStatus((p) => ({ ...p, [mcqId]: "Write something first." }));
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return;

    const { error } = await supabase.from("notes").insert({
      user_id: userId,
      mcq_id: mcqId,
      note_text: text,
    });

    if (error) {
      setNoteStatus((p) => ({ ...p, [mcqId]: "❌ " + error.message }));
      return;
    }

    setNoteStatus((p) => ({ ...p, [mcqId]: "✅ Saved!" }));
  }

  function optionText(q: MCQ, opt: "A" | "B" | "C" | "D") {
    if (opt === "A") return q.option_a;
    if (opt === "B") return q.option_b;
    if (opt === "C") return q.option_c;
    return q.option_d;
  }

  return (
    <AuthGuard>
      <main className="max-w-4xl mx-auto p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Results & Review</h1>
            <div className="text-sm text-gray-600">Date: {date}</div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-600">GS:</span>
            <select className="w-auto" value={gs} onChange={(e) => setGs(e.target.value as GsFilter)}>
              {GS_OPTIONS.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>

            <a className="btn btn-secondary" href={`/day/${date}?gs=${gs}`}>
              Back to Practice
            </a>

            <a className="btn btn-secondary" href="/dashboard">
              Dashboard
            </a>
          </div>
        </div>

        {msg && <p className="mt-4 text-red-600">{msg}</p>}

        {loading && <p className="mt-6">Loading...</p>}

        {!loading && !submitted && (
          <div className="mt-6 card card-body">
            <div className="text-lg font-semibold">Explanations are locked</div>
            <p className="text-gray-600 mt-2">
              You must submit MCQs first to unlock the review.
            </p>
            <div className="mt-4">
              <a className="btn btn-primary" href={`/day/${date}?gs=${gs}`}>
                Go to Practice
              </a>
            </div>
          </div>
        )}

        {!loading && submitted && (
          <>
            <div className="mt-6 grid md:grid-cols-3 gap-4">
              <div className="card card-body">
                <div className="text-sm text-gray-500">Score</div>
                <div className="text-2xl font-bold mt-1">
                  {correct} / {total}
                </div>
              </div>

              <div className="card card-body">
                <div className="text-sm text-gray-500">Accuracy</div>
                <div className="text-2xl font-bold mt-1">{accuracy}%</div>
              </div>

              <div className="card card-body">
                <div className="text-sm text-gray-500">Filter</div>
                <div className="text-2xl font-bold mt-1">{gs}</div>
              </div>
            </div>

            {mcqs.length === 0 ? (
              <div className="mt-6 card card-body">
                No MCQs available for this filter.
              </div>
            ) : (
              <div className="mt-8 space-y-4">
                {mcqs.map((q, idx) => {
                  const a = attempts[q.id];
                  const selected = a?.selected_option;
                  const correctOpt = q.correct_option;
                  const isCorrect = a?.is_correct;

                  return (
                    <div key={q.id} className="card card-body">
                      <div className="text-sm text-gray-500">{q.gs_paper || ""}</div>

                      <div className="font-semibold mt-1">
                        Q{idx + 1}. {q.question}
                      </div>

                      <div className="mt-3 space-y-2 text-sm">
                        {(["A", "B", "C", "D"] as const).map((opt) => {
                          const text = optionText(q, opt);

                          const isUser = selected === opt;
                          const isAns = correctOpt === opt;

                          const border =
                            isAns ? "border-green-600" : isUser ? "border-gray-900" : "border-gray-200";
                          const bg =
                            isAns ? "bg-green-50" : isUser ? "bg-gray-100" : "bg-white";

                          return (
                            <div key={opt} className={`p-3 rounded-lg border ${border} ${bg}`}>
                              <b>{opt}.</b> {text}
                              {isAns && <span className="ml-2 text-green-700 font-semibold">(Correct)</span>}
                              {isUser && !isAns && (
                                <span className="ml-2 text-gray-700 font-semibold">(Your choice)</span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-3">
                        {isCorrect ? (
                          <span className="text-green-700 font-semibold">✅ Correct</span>
                        ) : (
                          <span className="text-red-600 font-semibold">❌ Incorrect</span>
                        )}
                      </div>

                      <div className="mt-4">
                        <div className="font-semibold">Explanation</div>
                        <p className="text-gray-700 mt-1">{q.explanation}</p>
                      </div>

                      {/* Notes */}
                      <div className="mt-5">
                        <div className="font-semibold">My Notes</div>
                        <textarea
                          className="w-full border rounded-lg p-2 mt-2"
                          rows={3}
                          value={noteDraft[q.id] || ""}
                          onChange={(e) =>
                            setNoteDraft((p) => ({ ...p, [q.id]: e.target.value }))
                          }
                          placeholder="Write your takeaway / concept / trick..."
                        />
                        <div className="mt-2 flex items-center gap-2">
                          <button className="btn btn-secondary" onClick={() => saveNote(q.id)}>
                            Save Note
                          </button>
                          {noteStatus[q.id] && (
                            <span className="text-sm text-gray-600">{noteStatus[q.id]}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </AuthGuard>
  );
}