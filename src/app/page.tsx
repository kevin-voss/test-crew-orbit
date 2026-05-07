import { TradingDashboard } from "@/components/TradingDashboard";

export default function HomePage() {
  return (
    <main>
      <h1 className="sr-only">Trading simulation dashboard</h1>
      <TradingDashboard />
    </main>
  );
}
