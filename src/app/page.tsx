import Link from "next/link";

export default function HomePage() {
  return (
    <main className="max-w-6xl mx-auto p-8">
      {/* HERO */}
      <section className="text-center py-16">
        <h1 className="text-4xl md:text-5xl font-bold">
          Daily Structured UPSC Practice
        </h1>
        <p className="text-gray-600 mt-6 text-lg max-w-2xl mx-auto">
          Practice GS-wise MCQs, write Mains answers, browse date-wise Current
          Affairs, save notes, and track weak areas — all in one place.
        </p>

        <div className="mt-8 flex justify-center gap-4 flex-wrap">
          <Link href="/practice" className="btn btn-primary">
            Start Practice
          </Link>

          <Link href="/current-affairs" className="btn btn-secondary">
            Explore Current Affairs
          </Link>

          <Link href="/dashboard" className="btn btn-secondary">
            Open Dashboard
          </Link>
        </div>
      </section>

      {/* FEATURES */}
      <section className="grid md:grid-cols-3 gap-6 mt-10">
        <div className="card card-body">
          <h3 className="text-lg font-semibold">📅 Practice by Date</h3>
          <p className="text-gray-600 mt-2">
            Navigate previous and upcoming sets like an archive — no URL typing.
          </p>
        </div>

        <div className="card card-body">
          <h3 className="text-lg font-semibold">🎯 GS + Subject Focus</h3>
          <p className="text-gray-600 mt-2">
            Filter by GS1–GS4 and subject (Polity, Economy, Environment, etc.).
          </p>
        </div>

        <div className="card card-body">
          <h3 className="text-lg font-semibold">📊 Analytics + Notes</h3>
          <p className="text-gray-600 mt-2">
            Review explanations after submission, save notes, and track weak GS.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <section className="text-center text-sm text-gray-500 mt-16">
        Built for consistent UPSC preparation • Free for students
      </section>
    </main>
  );
}