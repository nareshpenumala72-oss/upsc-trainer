"use client";

export const dynamic = "force-dynamic";



import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type GsFilter = "All" | "GS1" | "GS2" | "GS3" | "GS4";
const GS_OPTIONS: GsFilter[] = ["All", "GS1", "GS2", "GS3", "GS4"];

type CA = {
  id: string;
  title: string;
  summary: string;
  gs_tags: string | null;
  gs_paper: string | null;
  date: string;
};

export default function CurrentAffairsDatePage() {
  const params = useParams<{ date: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const date = params.date;

  const qsGs = (searchParams.get("gs") || "All") as GsFilter;
  const [gs, setGs] = useState<GsFilter>(GS_OPTIONS.includes(qsGs) ? qsGs : "All");

  const [mounted, setMounted] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CA[]>([]);

  const [allDates, setAllDates] = useState<string[]>([]);
  const [prevDate, setPrevDate] = useState<string | null>(null);
  const [nextDate, setNextDate] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  // Auth check
  useEffect(() => {
    if (!mounted) return;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }
      setCheckingAuth(false);
    })();
  }, [mounted, router]);

  // Fetch unique dates
  useEffect(() => {
    if (!mounted || checkingAuth) return;

    (async () => {
      const { data, error } = await supabase
        .from("current_affairs")
        .select("date")
        .order("date", { ascending: true });

      if (error) return;

      const unique = Array.from(new Set((data || []).map((r: any) => r.date as string)));
      setAllDates(unique);
    })();
  }, [mounted, checkingAuth]);

  // Prev/Next
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

  // Keep URL synced
  useEffect(() => {
    if (!mounted) return;
    router.replace(`/current-affairs/${date}?gs=${gs}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gs, mounted]);

  // Fetch items
  useEffect(() => {
    if (!mounted || checkingAuth) return;

    (async () => {
      setLoading(true);

      let q = supabase
        .from("current_affairs")
        .select("id,title,summary,gs_tags,gs_paper,date")
        .eq("date", date)
        .order("created_at", { ascending: true });

      if (gs !== "All") q = q.eq("gs_paper", gs);

      const { data, error } = await q;

      if (!error) setItems((data || []) as CA[]);
      else setItems([]);

      setLoading(false);
    })();
  }, [mounted, checkingAuth, date, gs]);

  function goToDate(d: string) {
    router.push(`/current-affairs/${d}?gs=${gs}`);
  }

  if (!mounted || checkingAuth) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <div className="card card-body">Loading...</div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Current Affairs</h1>
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

          <select value={date} onChange={(e) => goToDate(e.target.value)} className="w-auto">
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

          <Link className="btn btn-secondary" href="/current-affairs">
            Back
          </Link>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span className="text-sm text-gray-600">GS:</span>
        <select className="w-auto" value={gs} onChange={(e) => setGs(e.target.value as GsFilter)}>
          {GS_OPTIONS.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>

        <Link className="btn btn-secondary ml-auto" href="/practice">
          Practice
        </Link>
      </div>

      {loading && <p className="mt-6">Loading...</p>}

      {!loading && items.length === 0 && (
        <div className="mt-6 card card-body">
          <p>No current affairs for this date/filter.</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="mt-6 space-y-4">
          {items.map((x) => (
            <div key={x.id} className="card card-body">
              <div className="text-sm text-gray-500">
                {x.gs_paper ? x.gs_paper : ""} {x.gs_tags ? `• ${x.gs_tags}` : ""}
              </div>
              <div className="text-xl font-semibold mt-1">{x.title}</div>
              <p className="mt-3 text-gray-700">{x.summary}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}