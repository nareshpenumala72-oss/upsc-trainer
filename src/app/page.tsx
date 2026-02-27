"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setHasSession(!!data.session);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <main className="p-8">Loading...</main>;
  }

  // ✅ Logged-in view: "Continue"
  if (hasSession) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <div className="card card-body">
          <h1 className="text-3xl font-bold">Welcome back 👋</h1>
          <p className="text-gray-600 mt-2">
            Continue from where you left off.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/practice" className="btn btn-primary">
              Continue Practice
            </Link>
            <Link href="/archive" className="btn btn-secondary">
              Browse Archive
            </Link>
          </div>
        </div>

        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <div className="card card-body">
            <div className="text-sm text-gray-500">Daily Practice</div>
            <div className="text-lg font-semibold mt-1">MCQs + Mains</div>
            <p className="text-gray-600 mt-2 text-sm">
              Attempt questions in an exam-like flow.
            </p>
          </div>

          <div className="card card-body">
            <div className="text-sm text-gray-500">Current Affairs</div>
            <div className="text-lg font-semibold mt-1">Date-wise notes</div>
            <p className="text-gray-600 mt-2 text-sm">
              Revise CA quickly with GS mapping.
            </p>
          </div>

          <div className="card card-body">
            <div className="text-sm text-gray-500">Analytics</div>
            <div className="text-lg font-semibold mt-1">Track progress</div>
            <p className="text-gray-600 mt-2 text-sm">
              Accuracy, streak, and weak areas (coming next).
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ✅ Logged-out view: clean landing (no duplicate nav buttons)
  return (
    <main className="max-w-4xl mx-auto p-6">
      <div className="card card-body">
        <h1 className="text-4xl font-bold">UPSC Daily Trainer</h1>
        <p className="text-gray-600 mt-3">
          A structured daily system for UPSC preparation: Current Affairs + MCQs + Mains Answer Writing.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/register" className="btn btn-primary">
            Get Started
          </Link>
          <Link href="/login" className="btn btn-secondary">
            Login
          </Link>
        </div>
      </div>

      <div className="mt-6 grid md:grid-cols-3 gap-4">
        <div className="card card-body">
          <div className="text-sm text-gray-500">Daily Practice</div>
          <div className="text-lg font-semibold mt-1">MCQs + Mains</div>
          <p className="text-gray-600 mt-2 text-sm">
            Improve accuracy and answer writing with timed practice.
          </p>
        </div>

        <div className="card card-body">
          <div className="text-sm text-gray-500">Current Affairs</div>
          <div className="text-lg font-semibold mt-1">Mapped to GS</div>
          <p className="text-gray-600 mt-2 text-sm">
            Revise by date and GS paper (GS1–GS4).
          </p>
        </div>

        <div className="card card-body">
          <div className="text-sm text-gray-500">Analytics</div>
          <div className="text-lg font-semibold mt-1">Track progress</div>
          <p className="text-gray-600 mt-2 text-sm">
            Streak, attempts, and weak topics.
          </p>
        </div>
      </div>
    </main>
  );
}