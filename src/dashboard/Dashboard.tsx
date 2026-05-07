import { DashboardShell } from "./DashboardShell";

/** Integration entry: shares the same shell and tick lifecycle as {@link MarketDashboard}. */
export function Dashboard(): JSX.Element {
  return <DashboardShell />;
}
