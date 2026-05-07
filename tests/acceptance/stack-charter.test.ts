import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Stack charter", () => {
  it("depends on Next.js, Tailwind CSS, and Zustand with persistence", () => {
    // covers AC-15
    const pkgPath = join(process.cwd(), "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(all.next).toBeDefined();
    expect(all.tailwindcss || all["@tailwindcss/postcss"]).toBeDefined();
    expect(all.zustand).toBeDefined();
  });

  it("depends on Lightweight Charts or Recharts for charting", () => {
    // covers AC-17
    const pkgPath = join(process.cwd(), "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    const hasLib = Boolean(all["lightweight-charts"] || all.recharts);
    expect(hasLib).toBe(true);
  });
});
