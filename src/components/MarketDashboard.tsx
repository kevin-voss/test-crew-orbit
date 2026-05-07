import { DashboardShell } from "../dashboard/DashboardShell";

/**
 * Dashboard shell: one tick controller drives ticker, chart, trade, and analytics from the same store snapshot.
 * Layout regions live in {@link DashboardShell}.
 */
export function MarketDashboard(): JSX.Element {
  return (
    <div data-testid="market-dashboard" className="w-full min-w-0 box-border">
      <DashboardShell />
    </div>
  );
}
