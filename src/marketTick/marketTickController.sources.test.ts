import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const marketTickDir = dirname(fileURLToPath(import.meta.url));
const srcDir = join(marketTickDir, "..");

const loopPath = join(marketTickDir, "marketTickLoop.ts");
const hookPath = join(marketTickDir, "useMarketTickController.ts");
const dashboardPath = join(srcDir, "components", "MarketDashboard.tsx");
const marketDashboardDir = join(srcDir, "components", "marketDashboard");

function listPanelSources(): string[] {
  if (!existsSync(marketDashboardDir)) return [];
  return readdirSync(marketDashboardDir)
    .filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"))
    .map((f) => join(marketDashboardDir, f));
}

function readReq(path: string): string {
  expect(existsSync(path), `expected ${path}`).toBe(true);
  return readFileSync(path, "utf8");
}

describe("market tick controller — source contracts (review / audit)", () => {
  it("keeps the tick loop client-only, on a ~2000 ms cadence, and documents background throttling expectations", () => {
    // covers AC-4, AC-9
    const src = readReq(loopPath);
    expect(src).toMatch(/2000|2_000/);
    expect(src.toLowerCase()).toMatch(/throttl|background|foreground|tab/);
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toMatch(/\bWebSocket\b/);
    expect(src).not.toMatch(/EventSource\b/);
  });

  it("gates React controller startup on market store hydration helpers", () => {
    // covers AC-5
    const src = readReq(hookPath);
    expect(src).toContain("onMarketStoreHydrationComplete");
    expect(src).toContain("marketStoreHasHydrated");
    expect(src).toContain("startMarketTickLoop");
  });

  it("keeps dashboard, hook, and panel sources free of simulation setInterval scheduling", () => {
    // covers AC-8
    const panelPaths = listPanelSources();
    expect(
      panelPaths.length,
      "expected TickerPanel / ChartStripPanel / AnalyticsPanel sources under components/marketDashboard/",
    ).toBeGreaterThan(0);

    const hookSrc = readReq(hookPath);
    expect(hookSrc).not.toMatch(/\bsetInterval\s*\(/);

    const dashSrc = readReq(dashboardPath);
    expect(dashSrc).not.toMatch(/\bsetInterval\s*\(/);

    for (const p of panelPaths) {
      const src = readReq(p);
      expect(src, p).not.toMatch(/\bsetInterval\s*\(/);
    }
  });

  it("does not add visibility-based pause/resume hacks to the tick hook or loop", () => {
    // covers AC-14
    const hookSrc = readReq(hookPath);
    const loopSrc = readReq(loopPath);
    expect(hookSrc).not.toMatch(/visibilitychange|visibilityState|document\.hidden/i);
    expect(loopSrc).not.toMatch(/visibilitychange|visibilityState|document\.hidden/i);
  });
});
