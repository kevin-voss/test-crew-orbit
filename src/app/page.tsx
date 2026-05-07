import { MarketProvider } from "@/components/MarketProvider";
import { TradingDashboard } from "@/components/TradingDashboard";

export default function HomePage() {
  return (
    <main>
      <MarketProvider>
        <h1 className="sr-only">Trading simulation dashboard</h1>
        <TradingDashboard />
      </MarketProvider>
    </main>
  );
}
