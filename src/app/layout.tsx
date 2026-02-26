import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "UPSC Daily Trainer",
  description: "Daily MCQs + Mains + Progress",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-bold tracking-tight">
              UPSC Daily Trainer
            </Link>

<nav className="flex items-center gap-4 text-sm">

    <Link className="hover:underline" href="/practice">
  Practice
</Link>

  <Link className="hover:underline" href="/dashboard">
    Dashboard
  </Link>

  <Link className="hover:underline" href="/admin/mcqs">
    Admin
  </Link>

  <Link className="hover:underline" href="/login">
    Login
  </Link>

  <Link className="hover:underline" href="/register">
    Register
  </Link>


</nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

        <footer className="mt-10 border-t bg-white">
          <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-gray-500">
            © {new Date().getFullYear()} UPSC Daily Trainer
          </div>
        </footer>
      </body>
    </html>
  );
}