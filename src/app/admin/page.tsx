"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import AdminGuard from "@/components/AdminGuard";

export default function AdminHomePage() {
  return (
    <AuthGuard>
      <AdminGuard>
        <main className="max-w-4xl mx-auto p-6">
          <h1 className="text-2xl font-bold mb-2">Admin Panel</h1>
          <p className="text-sm text-gray-600 mb-6">
            Manage content: Current Affairs, MCQs, Mains, and Daily Sets.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <Link
              href="/admin/current-affairs"
              className="card card-body hover:bg-gray-50 transition"
            >
              <div className="text-lg font-semibold">🗞️ Current Affairs</div>
              <div className="text-sm text-gray-600">
                Add CA items with date + GS paper
              </div>
            </Link>

            <Link
              href="/admin/mcqs"
              className="card card-body hover:bg-gray-50 transition"
            >
              <div className="text-lg font-semibold">❓ MCQs</div>
              <div className="text-sm text-gray-600">
                Add MCQs with GS paper + explanation
              </div>
            </Link>

            <Link
              href="/admin/mains"
              className="card card-body hover:bg-gray-50 transition"
            >
              <div className="text-lg font-semibold">✍️ Mains</div>
              <div className="text-sm text-gray-600">
                Add mains questions + structure hints
              </div>
            </Link>

            <Link
              href="/admin/daily-set"
              className="card card-body hover:bg-gray-50 transition"
            >
              <div className="text-lg font-semibold">📅 Daily Set Builder</div>
              <div className="text-sm text-gray-600">
                Create/publish daily sets + clone previous day
              </div>
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            <Link className="btn btn-secondary" href="/dashboard">
              Dashboard
            </Link>
            <Link className="btn btn-secondary" href="/practice">
              Practice
            </Link>
            <Link className="btn btn-secondary" href="/current-affairs">
              Current Affairs
            </Link>
          </div>
        </main>
      </AdminGuard>
    </AuthGuard>
  );
}