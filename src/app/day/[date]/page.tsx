"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";

type GsFilter = "All" | "GS1" | "GS2" | "GS3" | "GS4";
const GS_OPTIONS: GsFilter[] = ["All", "GS1", "GS2", "GS3", "GS4"];

type SubjectFilter = string; // we read from query param, allow any subject string

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
  subject: string | null;
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
  gs_paper: string | null;
};

type CurrentAffair = {
  id: string;
  title: string;
  summary: string;
  gs_tags: string | null;
  gs_paper: string | null;
  date: string;
};

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export default function DailyModulePage() {
  const params = useParams<{ date: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const date = params.date;

  const qsGs = (searchParams.get("gs") || "All") as GsFilter;
  const qsSubject = (searchParams.get("subject") || "All") as SubjectFilter;

  const [gs, setGs] = useState<GsFilter>(GS_OPTIONS.includes(qsGs) ? qsGs : "All");
  const [subject, setSubject] = useState<SubjectFilter>(qsSubject);

  const [allDates, setAllDates] = useState<string[]>([]);
  const [prevDate, setPrevDate] = useState<string | null>(null);
  const [nextDate, setNextDate] = useState<string | null>(null);

  const [dailySetId, setDailySetId] = useState<string | null>(null);

  const [currentAffairs, setCurrentAffairs] = useState<CurrentAffair[]>([]);
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [mains, setMains] = useState<MainsQ | null>(null);

  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>({});
  const [msg, setMsg] = useState<string | null>(null);

  // Mains answer box
  const [mainsAnswer, setMainsAnswer] = useState("");
  const [mainsMsg, setMainsMsg] = useState<string | null>(null);

  // Mains timer (20 mins)
  const TOTAL_MAIN_SECONDS = 20 * 60;
  const [mainSecondsLeft, setMainSecondsLeft] = useState(TOTAL_MAIN_SECONDS);
  const mainsTimerRef = useRef<number | null>(null);

  // ✅ NEW: MCQ timer (10 mins)
  const TOTAL_MCQ_SECONDS = 10 * 60;
  const [mcqSecondsLeft, setMcqSecondsLeft] = useState(TOTAL_MCQ_SECONDS);
  const mcqTimerRef = useRef<number | null>(null);
  const [mcqTimerStarted, setMcqTimerStarted] = useState(false);

  // Load list of all available dates
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("daily_sets")
        .select("date")
        .order("date", { ascending: true });

      if (!error) {
        const dates = (data || []).map((d: any) => d.date as string);
        setAllDates(dates);
      }
    })();
  }, []);

  // Compute prev/next
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

  // Keep URL synced with gs + subject
  useEffect(() => {
    router.replace(`/day/${date}?gs=${gs}&subject=${encodeURIComponent(subject)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gs, subject]);

  // Load day content
  useEffect(() => {
    (async () => {
      setMsg(null);
      setAnswers({});
      setMainsAnswer("");
      setMainsMsg(null);

      // reset timers
      setMainSecondsLeft(TOTAL_MAIN_SECONDS);
      if (mainsTimerRef.current) window.clearInterval(mainsTimerRef.current);
      mainsTimerRef.current = null;

      setMcqSecondsLeft(TOTAL_MCQ_SECONDS);
      if (mcqTimerRef.current) window.clearInterval(mcqTimerRef.current);
      mcqTimerRef.current = null;
      setMcqTimerStarted(false);

      // daily set
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
        setDailySetId(null);
        setMcqs([]);
        setMains(null);
        setCurrentAffairs([]);
        setMsg(`No daily set found for this date: ${date}`);
        return;
      }

      setDailySetId(ds.id);

      // CA (date) + gs filter
      let caQuery = supabase
        .from("current_affairs")
        .select("id,title,summary,gs_tags,gs_paper,date")
        .eq("date", date)
        .order("created_at", { ascending: true });

      if (gs !== "All") caQuery = caQuery.eq("gs_paper", gs);

      const { data: caData } = await caQuery;
      setCurrentAffairs((caData || []) as CurrentAffair[]);

      // daily_set_items
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

      const mainsIds = (items ?? [])
        .filter((x) => x.item_type === "mains")
        .map((x) => x.item_id);

      // MCQs
      if (mcqIds.length > 0) {
        const { data: qData, error: qErr } = await supabase
          .from("mcqs")
          .select(
            "id,question,option_a,option_b,option_c,option_d,correct_option,explanation,gs_paper,subject"
          )
          .in("id", mcqIds);

        if (qErr) {
          setMsg(qErr.message);
          return;
        }

        // keep order
        const map = new Map((qData || []).map((q: any) => [q.id, q]));
        const ordered = mcqIds
          .map((id) => map.get(id))
          .filter(Boolean) as MCQ[];

        // filters
        let filtered = gs === "All" ? ordered : ordered.filter((m) => m.gs_paper === gs);
        if (subject && subject !== "All") {
          filtered = filtered.filter((m) => (m.subject || "") === subject);
        }

        setMcqs(filtered);
      } else {
        setMcqs([]);
      }

      // Mains (pick first that matches GS if selected)
      if (mainsIds.length > 0) {
        const { data: mData, error: mErr } = await supabase
          .from("mains_questions")
          .select(
            "id,question,demand,keywords,structure_intro,structure_body,structure_conclusion,value_add,gs_paper"
          )
          .in("id", mainsIds);

        if (!mErr) {
          const mainsList = (mData || []) as MainsQ[];
          const pick =
            gs === "All"
              ? mainsList[0] || null
              : mainsList.find((m) => m.gs_paper === gs) || null;

          setMains(pick);
        } else {
          setMains(null);
        }
      } else {
        setMains(null);
      }
    })();

    return () => {
      if (mainsTimerRef.current) window.clearInterval(mainsTimerRef.current);
      if (mcqTimerRef.current) window.clearInterval(mcqTimerRef.current);
      mainsTimerRef.current = null;
      mcqTimerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, gs, subject]);

  // Derived counts
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const allAnswered = useMemo(
    () => mcqs.length > 0 && mcqs.every((q) => answers[q.id]),
    [mcqs, answers]
  );

  function goToDate(d: string) {
    router.push(`/day/${d}?gs=${gs}&subject=${encodeURIComponent(subject)}`);
  }

  function choose(mcqId: string, opt: "A" | "B" | "C" | "D") {
    // Start timer on first answer
    if (!mcqTimerStarted) startMcqTimer();
    setAnswers((prev) => ({ ...prev, [mcqId]: opt }));
  }

  async function submitMCQs(toReview: boolean) {
    setMsg(null);
    if (!dailySetId) return;
    if (!allAnswered) return setMsg("Please answer all questions.");

    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return;

const rows = mcqs
  .filter((q) => q.id && answers[q.id])
  .map((q) => {
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

     
    // submission marker
// submission marker
// submission marker
const { error: sErr } = await supabase
  .from("mcq_attempts")
  .insert({ user_id: userId, daily_set_id: dailySetId });

if (sErr && !String(sErr.message).toLowerCase().includes("duplicate")) {
  return setMsg(sErr.message);
}

    // stop timer
    if (mcqTimerRef.current) window.clearInterval(mcqTimerRef.current);
    mcqTimerRef.current = null;

    if (toReview) {
      router.push(`/day/${date}/review?gs=${gs}`);
    } else {
      setMsg("✅ MCQs submitted!");
    }
  }

  // MCQ Timer
  function startMcqTimer() {
    if (mcqTimerRef.current) return;
    setMcqTimerStarted(true);
    mcqTimerRef.current = window.setInterval(async () => {
      setMcqSecondsLeft((s) => {
        if (s <= 1) {
          // time over: auto-submit only if all answered
          if (mcqTimerRef.current) window.clearInterval(mcqTimerRef.current);
          mcqTimerRef.current = null;

          // auto-submit to review if possible
          setTimeout(() => {
            if (mcqs.length > 0 && mcqs.every((q) => answers[q.id])) {
              submitMCQs(true);
            }
          }, 0);

          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  // Mains timer
  function startMainsTimer() {
    if (mainsTimerRef.current) return;
    mainsTimerRef.current = window.setInterval(() => {
      setMainSecondsLeft((s) => {
        if (s <= 1) {
          if (mainsTimerRef.current) window.clearInterval(mainsTimerRef.current);
          mainsTimerRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  function resetMainsTimer() {
    if (mainsTimerRef.current) {
      window.clearInterval(mainsTimerRef.current);
      mainsTimerRef.current = null;
    }
    setMainSecondsLeft(TOTAL_MAIN_SECONDS);
  }

  async function submitMains() {
    setMainsMsg(null);
    if (!dailySetId) return;
    if (!mains) return setMainsMsg("No mains question for this filter.");
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

  const mainMM = String(Math.floor(mainSecondsLeft / 60)).padStart(2, "0");
  const mainSS = String(mainSecondsLeft % 60).padStart(2, "0");

  const mcqMM = String(Math.floor(mcqSecondsLeft / 60)).padStart(2, "0");
  const mcqSS = String(mcqSecondsLeft % 60).padStart(2, "0");

  return (
    <AuthGuard>
      <main className="max-w-4xl mx-auto p-6">
        {/* Header + navigation */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Daily Module</h1>
            <div className="text-sm text-gray-600">Date: {date}</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className="btn btn-secondary" onClick={() => prevDate && goToDate(prevDate)} disabled={!prevDate}>
              ← Previous
            </button>

            <select value={date} onChange={(e) => goToDate(e.target.value)} className="w-auto">
              {allDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <button className="btn btn-secondary" onClick={() => nextDate && goToDate(nextDate)} disabled={!nextDate}>
              Next →
            </button>

            <a className="btn btn-secondary" href="/practice">
              Practice Home
            </a>

            <a className="btn btn-secondary" href="/archive">
              Archive
            </a>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600">GS:</span>
          <select className="w-auto" value={gs} onChange={(e) => setGs(e.target.value as GsFilter)}>
            {GS_OPTIONS.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>

          <span className="text-sm text-gray-600 ml-2">Subject:</span>
          <input
            className="w-auto"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="All / Polity / Economy..."
          />

          <a className="btn btn-secondary ml-auto" href={`/day/${date}/review?gs=${gs}`}>
            Review
          </a>
        </div>

        {msg && <p className="mt-3 text-red-600">{msg}</p>}

        {/* Current Affairs */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Current Affairs</h2>
            <a className="text-sm underline" href="/current-affairs">
              Open CA Archive
            </a>
          </div>

          {currentAffairs.length === 0 ? (
            <p className="text-sm text-gray-600 mt-2">No current affairs for this date/filter.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {currentAffairs.map((ca) => (
                <div key={ca.id} className="card card-body">
                  <div className="text-sm text-gray-500">
                    {ca.gs_paper ? ca.gs_paper : ""} {ca.gs_tags ? `• ${ca.gs_tags}` : ""}
                  </div>
                  <div className="text-lg font-semibold mt-1">{ca.title}</div>
                  <p className="mt-2 text-gray-700">{ca.summary}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MCQs */}
        <h2 className="text-xl font-semibold mt-10">MCQs</h2>

        {/* MCQ Timer */}
        <div className="mt-3 card card-body bg-red-50">
          <div className="text-lg font-semibold">
            ⏳ MCQ Time Left: {mcqMM}:{mcqSS}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Timer starts when you choose your first option. (10 minutes total)
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-600">
          Answered {answeredCount} of {mcqs.length}
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div
            className="bg-gray-900 h-2 rounded-full transition-all"
            style={{ width: mcqs.length > 0 ? `${(answeredCount / mcqs.length) * 100}%` : "0%" }}
          />
        </div>

        {mcqs.length === 0 ? (
          <p className="text-sm text-gray-600 mt-3">No MCQs for this date/filter.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {mcqs.map((q, idx) => (
              <div key={q.id} className="card card-body">
                <div className="text-sm text-gray-500">
                  {q.gs_paper || ""} {q.subject ? `• ${q.subject}` : ""}
                </div>

                <div className="font-semibold mt-1">
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
        )}

        {/* Sticky submit MCQs */}
        <div className="sticky bottom-0 bg-white border-t p-4 mt-8">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div className="text-sm">
              {answeredCount} / {mcqs.length} answered
            </div>

            <button
              onClick={() => submitMCQs(true)}
              disabled={!allAnswered || mcqs.length === 0}
              className="btn btn-primary disabled:opacity-50"
            >
              Submit MCQs
            </button>
          </div>
        </div>

        {/* MAINS */}
        <h2 className="text-xl font-semibold mt-10">Mains Answer Writing</h2>

        {!mains ? (
          <p className="mt-3 text-gray-600">No mains question for this date/filter.</p>
        ) : (
          <div className="mt-4 card card-body space-y-3">
            <div className="text-sm text-gray-500">{mains.gs_paper || ""}</div>
            <div className="font-semibold">{mains.question}</div>

            {mains.demand && (
              <p className="text-sm text-gray-700">
                <b>Demand:</b> {mains.demand}
              </p>
            )}

            <div className="text-sm text-gray-700">
              <b>Timer:</b> {mainMM}:{mainSS}
              <div className="mt-2 flex gap-2">
                <button onClick={startMainsTimer} className="btn btn-secondary">
                  Start
                </button>
                <button onClick={resetMainsTimer} className="btn btn-secondary">
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