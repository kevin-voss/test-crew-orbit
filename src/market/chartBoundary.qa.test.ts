import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");
const marketDashboardDir = join(repoRoot, "src", "components", "marketDashboard");
const analyticsDir = join(repoRoot, "src", "analytics");

/** Substring guard aligned with chartSurfaces.architecture.acceptance.test.ts (AC-7). */
const forbiddenTokens = [
  "marketEngine",
  "useMarketTickController",
  "createMarketTickController",
  "marketTickController",
  "simulateTradeExecution",
  "setInterval",
  "clearInterval",
  "applyMarketTick",
] as const;

function collectChartLikeTsxFiles(): string[] {
  return readdirSync(marketDashboardDir)
    .filter(
      (name) =>
        name.endsWith(".tsx") &&
        name.includes("Chart") &&
        !name.includes(".test") &&
        !name.includes(".qa."),
    )
    .map((name) => join(marketDashboardDir, name));
}

function collectAnalyticsSourceFiles(): string[] {
  return readdirSync(analyticsDir)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => join(analyticsDir, name));
}

describe("chart boundary QA (forbidden imports / wiring in chart & analytics surfaces)", () => {
  it("scans marketDashboard *Chart*.tsx modules", () => {
    const paths = collectChartLikeTsxFiles();
    expect(paths.length, "expected at least one *Chart*.tsx under marketDashboard").toBeGreaterThan(0);

    for (const filePath of paths) {
      expect(statSync(filePath).isFile()).toBe(true);
      const src = readFileSync(filePath, "utf8");
      for (const token of forbiddenTokens) {
        expect(src.includes(token), `${filePath} must not contain ${token}`).toBe(false);
      }
    }
  });

  it("scans src/analytics non-test modules", () => {
    const paths = collectAnalyticsSourceFiles();
    expect(paths.length).toBeGreaterThan(0);

    for (const filePath of paths) {
      const src = readFileSync(filePath, "utf8");
      for (const token of forbiddenTokens) {
        expect(src.includes(token), `${filePath} must not contain ${token}`).toBe(false);
      }
    }
  });
});
