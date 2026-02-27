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
  keywords: string[] | null;
  structure_intro: string | null;
  structure_body: string | null;
  structure_conclusion: string | null;
  value_add: string | null;
};

type CurrentAffair = {
  id: string;
  title: string;
  summary: string;
  gs_tags: string;
  date: string;
};

type DailySetRow = { id: string; date: string };

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export default function DailyModulePage() {
  const params = useParams<{ date: string }>();
  const router = useRouter();
  const date = params.date; // YYYY-MM-DD

  const [dailySetId, setDailySetId] = useState<string | null>(null);
  const [currentAffair, setCurrentAffair] = useState<CurrentAffair | null>(null);

  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>(
    {}
  );

  const [mains, setMains] = useState<MainsQ | null>(null);
  const [mainsAnswer, setMainsAnswer] = useState("");
  const [mainsMsg, setMainsMsg] = useState<string | null>(null);

  const [msg, setMsg] = useState<string | null>(null);

  // NAV: all available daily set dates
  const [allDates, setAllDates] = useState<string[]>([]);
  const [prevDate, setPrevDate] = useState<string | null>(null);
  const [nextDate, setNextDate] = useState<string | null>(null);

  // 20 min timer
  const TOTAL_SECONDS = 20 * 60;
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const timerRef = useRef<number | null>(null);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const allAnswered = useMemo(
    () => mcqs.length > 0 && mcqs.every((q) => answers[q.id]),
    [mcqs, answers]
  );

  // NAV: fetch list of available dates (from daily_sets)
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("daily_sets")
        .select("date")
        .order("date", { ascending: true });

      if (error) return;

      const dates = (data || []).map((d: any) => d.date as string);
      setAllDates(dates);
    })();
  }, []);

  // NAV: compute prev/next based on current date
  useEffect(() => {
    if (allDates.length === 0) {
      setPrevDate(null);
      setNextDate(null);
      return;
    }

    const idx = allDates.indexOf(date);
    if (idx === -1) {
      setPrevDate(null);
      setNextDate(null);
      return;
    }

    setPrevDate(idx > 0 ? allDates[idx - 1] : null);
    setNextDate(idx < allDates.length - 1 ? allDates[idx + 1] : null);
  }, [allDates, date]);

  // Load the day content
  useEffect(() => {
    (async () => {
      setMsg(null);
      setAnswers({});
      setMainsAnswer("");
      setSecondsLeft(TOTAL_SECONDS);

      // 1) daily set
      const { data: ds, error: dsErr } = await supabase
        .from("daily_sets")
        .select("id")
        .eq("date", date)
        .maybeSingle();

      if (dsErr) {
        setMsg(dsErr.message);
        return;
      }
      if (!ds) {
        setMsg(`No daily set found for this date: ${date}`);
        setDailySetId(null);
        setMcqs([]);
        setMains(null);
        setCurrentAffair(null);
        return;
      }

      setDailySetId(ds.id);

      // 2) current affairs for this date (optional)
      const { data: ca } = await supabase
        .from("current_affairs")
        .select("id,title,summary,gs_tags,date")
        .eq("date", date)
        .maybeSingle();

      setCurrentAffair((ca as CurrentAffair) || null);

      // 3) items
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

      // 4) mcqs
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
        setMcqs([]);
      }

      // 5) mains
      if (mainsId) {
        const { data: mData, error: mErr } = await supabase
          .from("mains_questions")
          .select(
            "id,question,demand,keywords,structure_intro,structure_body,structure_conclusion,value_add"
          )
          .eq("id", mainsId)
          .single();

        if (!mErr) setMains(mData as MainsQ);
        else setMains(null);
      } else {
        setMains(null);
      }
    })();

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  function goToDate(d: string) {
    router.push(`/day/${d}`);
  }

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
    if (timerRef.current) return;
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
    if (!mains) return setMainsMsg("No mains question for this day.");
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
        {/* Top bar navigation */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Daily Module</h1>
            <div className="text-sm text-gray-600">Date: {date}</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              className="btn btn-secondary"
              onClick={() => prevDate && goToDate(prevDate)}
              disabled={!prevDate}
            >
              ← Previous
            </button>

            <select
              value={date}
              onChange={(e) => goToDate(e.target.value)}
              className="w-auto"
            >
              {allDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <button
              className="btn btn-secondary"
              onClick={() => nextDate && goToDate(nextDate)}
              disabled={!nextDate}
            >
              Next →
            </button>

            <a className="btn btn-secondary" href="/archive">
              Archive
            </a>
          </div>
        </div>

        {msg && <p className="mt-3 text-red-600">{msg}</p>}

        {/* Current Affairs */}
        {currentAffair && (
          <div className="card card-body mt-6">
            <div className="text-sm text-gray-500">{currentAffair.gs_tags}</div>
            <div className="text-xl font-semibold mt-1">
              {currentAffair.title}
            </div>
            <p className="mt-3 text-gray-700">{currentAffair.summary}</p>
          </div>
        )}

        {/* MCQs */}
        <h2 className="text-xl font-semibold mt-8">MCQs</h2>
        <div className="mt-2 text-sm text-gray-600">
          Answered {answeredCount} of {mcqs.length}
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div
            className="bg-gray-900 h-2 rounded-full transition-all"
            style={{
              width: mcqs.length > 0 ? `${(answeredCount / mcqs.length) * 100}%` : "0%",
            }}
          />
        </div>

        <div className="mt-4 space-y-4">
          {mcqs.map((q, idx) => (
            <div key={q.id} className="card card-body">
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
                    >
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === opt}
                        onChange={() => choose(q.id, opt)}
                        className="mt-1"
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

        {/* Sticky Submit */}
        <div className="sticky bottom-0 bg-white border-t p-4 mt-8">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div className="text-sm">
              {answeredCount} / {mcqs.length} answered
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
          <p className="mt-3 text-gray-600">No mains question added for this day yet.</p>
        ) : (
          <div className="mt-4 card card-body space-y-3">
            <div className="font-semibold">{mains.question}</div>

            {mains.demand && (
              <p className="text-sm text-gray-700">
                <b>Demand:</b> {mains.demand}
              </p>
            )}

            <div className="text-sm text-gray-700">
              <b>Timer:</b> {mm}:{ss}
              <div className="mt-2 flex gap-2">
                <button onClick={startTimer} className="btn btn-secondary">
                  Start
                </button>
                <button onClick={resetTimer} className="btn btn-secondary">
                  Reset
                </button>
              </div>
            </div>

            <div className="text-sm text-gray-700">
              <b>Word count:</b> {wordCount(mainsAnswer)}
            </div>

            <textarea
              rows={10}
              value={mainsAnswer}
              onChange={(e) => setMainsAnswer(e.target.value)}
              placeholder="Write your answer here..."
            />

            <button onClick={submitMains} className="btn btn-primary">
              Submit Mains Answer
            </button>

            {mainsMsg && <p className="text-sm mt-2">{mainsMsg}</p>}
          </div>
        )}
      </main>
    </AuthGuard>
  );
}