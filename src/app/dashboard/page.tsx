"use client";

import { MarketDashboard } from "../../components/MarketDashboard";

export default function DashboardPage() {
  return (
    <main className="flex min-h-screen flex-col bg-neutral-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 flex-col overflow-x-hidden">
        <MarketDashboard />
      </div>
    </main>
  );
}
