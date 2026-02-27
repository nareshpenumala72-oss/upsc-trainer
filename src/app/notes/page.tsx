"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type NoteRow = {
  id: string;
  user_id: string;
  mcq_id: string | null;
  mains_id: string | null;
  note_text: string;
  created_at: string;
};

type MCQMini = {
  id: string;
  question: string;
  gs_paper: string | null;
};

type FilterType = "All" | "MCQ" | "Mains";
type GsFilter = "All" | "GS1" | "GS2" | "GS3" | "GS4";
const GS_OPTIONS: GsFilter[] = ["All", "GS1", "GS2", "GS3", "GS4"];

export default function NotesPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [mcqMap, setMcqMap] = useState<Record<string, MCQMini>>({});

  const [type, setType] = useState<FilterType>("All");
  const [gs, setGs] = useState<GsFilter>("All");
  const [q, setQ] = useState("");

  useEffect(() => setMounted(true), []);

  // client-only auth check
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

  // fetch notes + related mcqs
  useEffect(() => {
    if (!mounted || checkingAuth) return;

    (async () => {
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) {
        setLoading(false);
        return;
      }

      const { data: nData, error: nErr } = await supabase
        .from("notes")
        .select("id,user_id,mcq_id,mains_id,note_text,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (nErr) {
        setNotes([]);
        setMcqMap({});
        setLoading(false);
        return;
      }

      const rows = (nData || []) as NoteRow[];
      setNotes(rows);

      const mcqIds = Array.from(
        new Set(rows.map((r) => r.mcq_id).filter(Boolean) as string[])
      );

      if (mcqIds.length > 0) {
        const { data: mData } = await supabase
          .from("mcqs")
          .select("id,question,gs_paper")
          .in("id", mcqIds);

        const map: Record<string, MCQMini> = {};
        (mData || []).forEach((m: any) => {
          map[m.id] = {
            id: m.id,
            question: m.question,
            gs_paper: m.gs_paper ?? null,
          };
        });
        setMcqMap(map);
      } else {
        setMcqMap({});
      }

      setLoading(false);
    })();
  }, [mounted, checkingAuth]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return notes.filter((n) => {
      // type filter
      if (type === "MCQ" && !n.mcq_id) return false;
      if (type === "Mains" && !n.mains_id) return false;

      // gs filter (only meaningful for mcq notes)
      if (gs !== "All") {
        if (!n.mcq_id) return false;
        const m = mcqMap[n.mcq_id];
        if (!m || m.gs_paper !== gs) return false;
      }

      // text search
      if (!query) return true;
      const mcqText = n.mcq_id ? (mcqMap[n.mcq_id]?.question || "") : "";
      return (
        n.note_text.toLowerCase().includes(query) ||
        mcqText.toLowerCase().includes(query)
      );
    });
  }, [notes, mcqMap, type, gs, q]);

  if (!mounted || checkingAuth) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <div className="card card-body">Loading...</div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto p-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Notes</h1>
          <p className="text-sm text-gray-600">
            Your saved takeaways from MCQs / Mains.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link className="btn btn-secondary" href="/dashboard">
            Dashboard
          </Link>
          <Link className="btn btn-secondary" href="/progress">
            Progress
          </Link>
        </div>
      </div>

      <div className="card card-body mb-6">
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <div className="text-sm text-gray-600">Type</div>
            <select
              className="w-full mt-1"
              value={type}
              onChange={(e) => setType(e.target.value as FilterType)}
            >
              <option value="All">All</option>
              <option value="MCQ">MCQ</option>
              <option value="Mains">Mains</option>
            </select>
          </div>

          <div>
            <div className="text-sm text-gray-600">GS</div>
            <select
              className="w-full mt-1"
              value={gs}
              onChange={(e) => setGs(e.target.value as GsFilter)}
            >
              {GS_OPTIONS.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-sm text-gray-600">Search</div>
            <input
              className="w-full mt-1"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search notes or MCQ question..."
            />
          </div>
        </div>
      </div>

      {loading && <p>Loading...</p>}

      {!loading && filtered.length === 0 && (
        <div className="card card-body">No notes found.</div>
      )}

      <div className="space-y-3">
        {filtered.map((n) => {
          const mcq = n.mcq_id ? mcqMap[n.mcq_id] : null;
          const created = new Date(n.created_at).toLocaleString();

          return (
            <div key={n.id} className="card card-body">
              <div className="text-sm text-gray-500">
                {mcq ? `MCQ • ${mcq.gs_paper || ""}` : n.mains_id ? "Mains" : "Note"} • {created}
              </div>

              {mcq && (
                <div className="mt-2 text-sm">
                  <span className="font-semibold">Question:</span>{" "}
                  <span className="text-gray-700">{mcq.question}</span>
                </div>
              )}

              <div className="mt-3 whitespace-pre-wrap text-gray-800">
                {n.note_text}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}