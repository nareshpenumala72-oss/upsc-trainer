"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";

type CA = {
  id: string;
  title: string;
  summary: string;
  gs_tags: string;
  date: string;
};

export default function CurrentAffairsDatePage() {
  const params = useParams<{ date: string }>();
  const date = params.date;

  const [items, setItems] = useState<CA[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("current_affairs")
        .select("id,title,summary,gs_tags,date")
        .eq("date", date)
        .order("created_at", { ascending: true });

      if (!error) setItems((data || []) as CA[]);
      setLoading(false);
    })();
  }, [date]);

  return (
    <AuthGuard>
      <main className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Current Affairs</h1>
            <p className="text-sm text-gray-600">Date: {date}</p>
          </div>
          <a className="btn btn-secondary" href="/current-affairs">
            Back
          </a>
        </div>

        {loading && <p>Loading...</p>}
        {!loading && items.length === 0 && <p>No items for this date.</p>}

        <div className="space-y-4">
          {items.map((x) => (
            <div key={x.id} className="card card-body">
              <div className="text-sm text-gray-500">{x.gs_tags}</div>
              <div className="text-xl font-semibold mt-1">{x.title}</div>
              <p className="mt-3 text-gray-700">{x.summary}</p>
            </div>
          ))}
        </div>
      </main>
    </AuthGuard>
  );
}