"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AuthGuard from "@/components/AuthGuard";

type MCQ = {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  explanation: string;
};

type MainsQ = {
  id: string;
  question: string;
  demand: string | null;
  keywords: string[];
  structure_intro: string | null;
  structure_body: string | null;
  structure_conclusion: string | null;
  value_add: string | null;
};

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export default function DailyModulePage() {
  const params = useParams<{ date: string }>();
  const router = useRouter();
  const date = params.date;

  const [dailySetId, setDailySetId] = useState<string | null>(null);

  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>(
    {}
  );

  const [mains, setMains] = useState<MainsQ | null>(null);
  const [mainsAnswer, setMainsAnswer] = useState("");
  const [mainsMsg, setMainsMsg] = useState<string | null>(null);

  const [msg, setMsg] = useState<string | null>(null);

  // 20 min timer (adjust later)
  const TOTAL_SECONDS = 20 * 60;
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const timerRef = useRef<number | null>(null);

  const allAnswered = useMemo(
    () => mcqs.length > 0 && mcqs.every((q) => answers[q.id]),
    [mcqs, answers]
  );

  useEffect(() => {
    (async () => {
      setMsg(null);

      const { data: ds, error: dsErr } = await supabase
        .from("daily_sets")
        .select("id")
        .eq("date", date)
        .single();

      if (dsErr || !ds) {
        setMsg("No daily set found for this date.");
        return;
      }
      setDailySetId(ds.id);

      const { data: items, error: itErr } = await supabase
        .from("daily_set_items")
        .select("item_type, item_id")
        .eq("daily_set_id", ds.id);

      if (itErr) {
        setMsg(itErr.message);
        return;
      }

      const mcqIds = (items ?? [])
        .filter((x) => x.item_type === "mcq")
        .map((x) => x.item_id);

      const mainsId = (items ?? []).find((x) => x.item_type === "mains")?.item_id;

      if (mcqIds.length > 0) {
        const { data: qData, error: qErr } = await supabase
          .from("mcqs")
          .select(
            "id,question,option_a,option_b,option_c,option_d,correct_option,explanation"
          )
          .in("id", mcqIds);

        if (qErr) {
          setMsg(qErr.message);
          return;
        }

        const map = new Map((qData ?? []).map((q: any) => [q.id, q]));
        setMcqs(mcqIds.map((id) => map.get(id)).filter(Boolean) as MCQ[]);
      } else {
        setMsg("No MCQs found in this daily set.");
      }

      if (mainsId) {
        const { data: mData, error: mErr } = await supabase
          .from("mains_questions")
          .select(
            "id,question,demand,keywords,structure_intro,structure_body,structure_conclusion,value_add"
          )
          .eq("id", mainsId)
          .single();

        if (!mErr) setMains(mData as MainsQ);
      }
    })();

    // cleanup timer on route change
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [date]);

  function choose(mcqId: string, opt: "A" | "B" | "C" | "D") {
    setAnswers((prev) => ({ ...prev, [mcqId]: opt }));
  }

  async function submitMCQs() {
    setMsg(null);
    if (!dailySetId) return;
    if (!allAnswered) return setMsg("Please answer all questions.");

    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return;

    const rows = mcqs.map((q) => {
      const selected = answers[q.id];
      return {
        user_id: userId,
        daily_set_id: dailySetId,
        mcq_id: q.id,
        selected_option: selected,
        is_correct: selected === q.correct_option,
      };
    });

    const { error: aErr } = await supabase.from("mcq_attempts").upsert(rows, {
      onConflict: "user_id,daily_set_id,mcq_id",
    });
    if (aErr) return setMsg(aErr.message);

    const { error: sErr } = await supabase
      .from("daily_mcq_submissions")
      .insert({ user_id: userId, daily_set_id: dailySetId });

    if (sErr && !String(sErr.message).toLowerCase().includes("duplicate")) {
      return setMsg(sErr.message);
    }

    router.push(`/day/${date}/review`);
  }

  function startTimer() {
    if (timerRef.current) return; // already running
    timerRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  function resetTimer() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setSecondsLeft(TOTAL_SECONDS);
  }

  async function submitMains() {
    setMainsMsg(null);
    if (!dailySetId) return;
    if (!mains) return setMainsMsg("No mains question for today.");
    if (wordCount(mainsAnswer) < 30)
      return setMainsMsg("Write at least ~30 words before submitting.");

    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return;

    const { error } = await supabase.from("mains_submissions").insert({
      user_id: userId,
      daily_set_id: dailySetId,
      mains_question_id: mains.id,
      answer_text: mainsAnswer,
    });

    if (error) return setMainsMsg("❌ " + error.message);

    setMainsMsg("✅ Mains answer submitted!");
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <AuthGuard>
      <main className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold">Daily Module: {date}</h1>
        {msg && <p className="mt-3 text-red-600">{msg}</p>}

        {/* MCQs */}
        <h2 className="text-xl font-semibold mt-6">MCQs</h2>
        <div className="mt-2 text-sm text-gray-600">
  Answered {Object.keys(answers).length} of {mcqs.length}
</div>

<div className="w-full bg-gray-200 rounded-full h-2 mt-2">
  <div
    className="bg-gray-900 h-2 rounded-full transition-all"
    style={{
      width:
        mcqs.length > 0
          ? `${(Object.keys(answers).length / mcqs.length) * 100}%`
          : "0%",
    }}
  />
</div>
        <div className="mt-4 space-y-4">
          {mcqs.map((q, idx) => (
            <div key={q.id} className="bg-white p-4 rounded-xl shadow">
              <div className="font-semibold">
                Q{idx + 1}. {q.question}
              </div>

              <div className="mt-3 space-y-2">
                {(["A", "B", "C", "D"] as const).map((opt) => {
                  const text =
                    opt === "A"
                      ? q.option_a
                      : opt === "B"
                      ? q.option_b
                      : opt === "C"
                      ? q.option_c
                      : q.option_d;

                  return (
<label
  key={opt}
  className={`flex gap-3 items-start p-3 rounded-lg border cursor-pointer transition ${
    answers[q.id] === opt
      ? "border-gray-900 bg-gray-100"
      : "border-gray-200 hover:bg-gray-50"
  }`}
>                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === opt}
                        onChange={() => choose(q.id, opt)}
                      />
                      <span>
                        <b>{opt}.</b> {text}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

<div className="sticky bottom-0 bg-white border-t p-4 mt-8">
  <div className="max-w-4xl mx-auto flex justify-between items-center">
    <div className="text-sm">
      {Object.keys(answers).length} / {mcqs.length} answered
    </div>

    <button
      onClick={submitMCQs}
      disabled={!allAnswered}
      className="btn btn-primary disabled:opacity-50"
    >
      Submit MCQs
    </button>
  </div>
</div>

        {/* MAINS */}
        <h2 className="text-xl font-semibold mt-10">Mains Answer Writing</h2>

        {!mains ? (
          <p className="mt-3 text-gray-600">
            No mains question added for this day yet (admin needs to attach it).
          </p>
        ) : (
          <div className="mt-4 bg-white p-4 rounded-xl shadow space-y-3">
            <div className="font-semibold">{mains.question}</div>

            {mains.demand && (
              <p className="text-sm text-gray-700">
                <b>Demand:</b> {mains.demand}
              </p>
            )}

            <div className="text-sm text-gray-700">
              <b>Timer:</b> {mm}:{ss}
              <div className="mt-2 flex gap-2">
                <button
                  onClick={startTimer}
                  className="border px-3 py-1 rounded"
                >
                  Start
                </button>
                <button
                  onClick={resetTimer}
                  className="border px-3 py-1 rounded"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="text-sm text-gray-700">
              <b>Word count:</b> {wordCount(mainsAnswer)}
            </div>

            <textarea
              className="w-full border rounded-lg p-2"
              rows={10}
              value={mainsAnswer}
              onChange={(e) => setMainsAnswer(e.target.value)}
              placeholder="Write your answer here..."
            />

            <button
              onClick={submitMains}
              className="bg-black text-white px-4 py-2 rounded"
            >
              Submit Mains Answer
            </button>

            {mainsMsg && <p className="text-sm mt-2">{mainsMsg}</p>}

            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-medium">
                Show model structure hints
              </summary>
              <div className="mt-2 text-sm space-y-2">
                {mains.structure_intro && (
                  <p>
                    <b>Intro:</b> {mains.structure_intro}
                  </p>
                )}
                {mains.structure_body && (
                  <p>
                    <b>Body:</b> {mains.structure_body}
                  </p>
                )}
                {mains.structure_conclusion && (
                  <p>
                    <b>Conclusion:</b> {mains.structure_conclusion}
                  </p>
                )}
                {mains.value_add && (
                  <p>
                    <b>Value add:</b> {mains.value_add}
                  </p>
                )}
              </div>
            </details>
          </div>
        )}
      </main>
    </AuthGuard>
  );
}