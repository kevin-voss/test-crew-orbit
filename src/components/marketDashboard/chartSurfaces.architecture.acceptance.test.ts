import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const marketDashboardDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(marketDashboardDir, "..", "..", "..");
const packageJsonPath = join(repoRoot, "package.json");

const chartLikeUiModuleNames = [
  "SelectedTickerPriceChart.tsx",
  "EquityCurveChart.tsx",
  "HoldingsDiversificationChart.tsx",
  "ChartStripPanel.tsx",
  "AnalyticsPanel.tsx",
];

const forbiddenTokens = [
  "marketEngine",
  "useMarketTickController",
  "createMarketTickController",
  "marketTickController",
  "simulateTradeExecution",
  "setInterval",
  "clearInterval",
  "applyMarketTick",
];

describe("Chart and analytics layering (architecture acceptance)", () => {
  it("keeps chart and analytics dashboard modules free of tick, engine, and trade-simulation wiring", () => {
    // covers AC-7
    for (const name of chartLikeUiModuleNames) {
      const path = join(marketDashboardDir, name);
      expect(existsSync(path), `expected ${name} to exist for layering audit`).toBe(true);
      const src = readFileSync(path, "utf8");
      for (const token of forbiddenTokens) {
        expect(src.includes(token), `${name} must not contain ${token}`).toBe(false);
      }
      expect(src.includes("applyMarketTick"), `${name} must not invoke applyMarketTick`).toBe(false);
    }
  });

  it("declares Recharts as the sole supported chart dependency on the dashboard", () => {
    // covers AC-8
    const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    const deps = { ...pkg.dependencies, ...pkg.peerDependencies };
    expect(deps.recharts, "package.json must list recharts in dependencies or peerDependencies").toBeTruthy();
    expect(
      deps["lightweight-charts"],
      "package.json must not add lightweight-charts when standardizing on Recharts",
    ).toBeUndefined();
  });
});
