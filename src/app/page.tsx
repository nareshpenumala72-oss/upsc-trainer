import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-2xl px-6">
        <h1 className="text-4xl font-bold mb-4">
          UPSC Daily Trainer
        </h1>

        <p className="text-gray-600 mb-8">
          Structured daily practice for UPSC Aspirants.
          Current Affairs • MCQs • Mains Answer Writing • Analytics
        </p>

        <div className="flex justify-center gap-4 flex-wrap">
          <Link href="/practice" className="btn btn-primary">
            Start Practice
          </Link>

          <Link href="/current-affairs" className="btn btn-secondary">
            Current Affairs
          </Link>

          <Link href="/dashboard" className="btn btn-secondary">
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}