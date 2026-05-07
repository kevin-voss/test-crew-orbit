import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

describe("Market math isolation", () => {
  it("keeps GBM and tick-step math only in src/utils/marketEngine.ts", () => {
    // covers AC-14
    const root = join(process.cwd(), "src");
    expect(
      existsSync(root),
      "implementation must add src/ before AC-14 can pass",
    ).toBe(true);
    const allow = join(root, "utils", "marketEngine.ts").replace(/\\/g, "/");
    const files = walk(root).filter((f) => /\.(ts|tsx)$/.test(f));
    const banned =
      /\b(brownian|geometric brownian|GBM|sqrt\(\s*dt\s*\)|Math\.exp\([^)]*-0\.5)/i;
    for (const file of files) {
      const normalized = file.replace(/\\/g, "/");
      if (normalized === allow) continue;
      const code = readFileSync(file, "utf8");
      expect(
        { file: relative(process.cwd(), file), hit: banned.test(code) },
      ).toEqual({ file: relative(process.cwd(), file), hit: false });
    }
  });
});
