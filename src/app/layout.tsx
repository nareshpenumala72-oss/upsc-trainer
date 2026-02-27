import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "UPSC Daily Trainer",
  description: "Daily practice for UPSC aspirants",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="border-b bg-white">
          <nav className="max-w-5xl mx-auto p-4 flex flex-wrap items-center gap-3">
            <Link href="/" className="font-bold">
              UPSC Daily Trainer
            </Link>

            <div className="ml-auto flex flex-wrap gap-2">
              <Link className="btn btn-secondary" href="/dashboard">
                Dashboard
              </Link>
              <Link className="btn btn-secondary" href="/practice">
                Practice
              </Link>
              <Link className="btn btn-secondary" href="/current-affairs">
                Current Affairs
              </Link>
              <Link className="btn btn-secondary" href="/notes">
                Notes
              </Link>
              <Link className="btn btn-secondary" href="/progress">
                Progress
              </Link>
              <Link className="btn btn-secondary" href="/admin">
                Admin
              </Link>
              <Link className="btn btn-secondary" href="/login">
                Login
              </Link>
            </div>
          </nav>
        </header>

        {children}
      </body>
    </html>
  );
}