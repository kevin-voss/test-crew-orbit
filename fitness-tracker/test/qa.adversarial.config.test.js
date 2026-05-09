/**
 * QA Adversarial Tests — Build & test configuration gaps
 *
 * Targets: vitest.config.js, vite.config.js, UI component alias resolution
 * Focus: config mismatches that prevent components from being tested,
 *        CI-hostile flags, and layout bugs invisible to unit tests.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function read(rel) {
  return readFileSync(resolve(root, rel), 'utf8')
}

// ---------------------------------------------------------------------------
// vitest.config.js must carry the same @/ alias as vite.config.js
// ---------------------------------------------------------------------------
describe('QA Adversarial — vitest.config.js: missing @/ alias', () => {
  it('vitest.config.js resolves the "@" alias so UI components can be tested', () => {
    // BUG: vite.config.js maps "@" → "./src" via resolve.alias, but vitest.config.js
    // has NO alias config.  Any test file that imports button.jsx, card.jsx, or
    // chart.jsx will crash with "Cannot find module '@/lib/utils'".
    // This means the shadcn UI components are untestable in the current setup.
    //
    // Evidence: src/components/ui/button.jsx line 4
    //           import { cn } from "@/lib/utils"
    //
    // covers AC-2 (developer can work with components) and AC-1 (build tooling aligned)
    const vitestCfg = read('vitest.config.js')
    // Expect an alias/resolve block covering "@"
    const hasAlias = /@/.test(vitestCfg) && /alias|resolve/.test(vitestCfg)
    expect(hasAlias).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// vite.config.js CI-hostile flag: open: true
// ---------------------------------------------------------------------------
describe('QA Adversarial — vite.config.js: CI-hostile server.open flag', () => {
  it('vite.config.js does not set server.open to true (breaks headless CI)', () => {
    // BUG: vite.config.js has server: { open: true }.  In a headless CI environment
    // (no display, no browser) Vite's dev server will fail to open a browser and
    // may hang or emit errors.  This is harmless locally but breaks automated
    // validation pipelines.
    //
    // covers AC-1 (app starts successfully implies the tooling can be run without error)
    const viteCfg = read('vite.config.js')
    // open: true should not appear (or should be false / absent)
    expect(viteCfg).not.toMatch(/open\s*:\s*true/)
  })
})

// ---------------------------------------------------------------------------
// Sidebar.jsx: absolute-positioned footer missing relative parent
// ---------------------------------------------------------------------------
describe('QA Adversarial — Sidebar.jsx: absolute footer without relative container', () => {
  it('the aside element carries "relative" to contain the absolute-positioned footer', () => {
    // BUG: Sidebar.jsx renders a footer div with class "absolute bottom-0 left-0 w-64".
    // The <aside> wrapper has no "relative" class, so the footer escapes the sidebar
    // and positions relative to the nearest positioned ancestor (the h-screen flex root
    // or the viewport).  The result is visual overlap with the main content area.
    //
    // In a flex-layout context without explicit relative positioning, Tailwind's
    // "absolute" pulls the element out of normal flow and the sidebar collapses,
    // losing the reserved height for the footer.
    //
    // covers AC-2 (layout shell must be structurally sound for future feature work)
    const sidebar = read('src/layout/Sidebar.jsx')

    // The aside opening tag must include "relative" in its className
    const asideMatch = sidebar.match(/<aside[^>]*className=["'`]([^"'`]*)["'`]/)
    const asideClasses = asideMatch ? asideMatch[1] : ''

    expect(asideClasses).toMatch(/relative/)
  })
})

// ---------------------------------------------------------------------------
// UI components: @/ alias import resolves at test time
// ---------------------------------------------------------------------------
describe('QA Adversarial — UI component alias: @/lib/utils import must resolve in Vitest', () => {
  it('button.jsx uses @/lib/utils import — vitest alias gap means direct import fails', () => {
    // Demonstrates: the alias gap means that importing button.jsx in any test
    // file will throw "ERR_MODULE_NOT_FOUND" for "@/lib/utils".
    // This test documents the risk by verifying the alias is absent from vitest.config.
    const vitestCfg = read('vitest.config.js')
    const buttonSrc = read('src/components/ui/button.jsx')

    // button.jsx relies on @/ alias
    expect(buttonSrc).toMatch(/@\/lib\/utils/)

    // vitest.config.js does NOT define that alias → components untestable
    // This assertion documents the current (broken) state so the developer
    // knows to add a resolve.alias block to vitest.config.js.
    const vitestHasAlias = /alias/.test(vitestCfg)
    expect(vitestHasAlias).toBe(true) // FAILS: alias block is absent
  })
})

// ---------------------------------------------------------------------------
// chart.jsx: ChartStyle dangerouslySetInnerHTML with empty config
// ---------------------------------------------------------------------------
describe('QA Adversarial — chart.jsx: ChartStyle with empty config object', () => {
  it('ChartStyle returns null when config has no color/theme entries (safe no-op)', () => {
    // ChartStyle filters config entries for those with .theme or .color.
    // If config is {} (empty), colorConfig is [], and it returns null.
    // This is the correct safe behaviour — but we verify the implementation
    // matches by reading the source and confirming the guard exists.
    //
    // covers AC-2 — chart component used for future analytics view
    const chartSrc = read('src/components/ui/chart.jsx')

    // Guard: the length check before returning null must be present
    expect(chartSrc).toMatch(/colorConfig\.length/)
    expect(chartSrc).toMatch(/return null/)
  })

  it('useChart throws a descriptive error when used outside ChartContainer', () => {
    // covers AC-2 — any developer using useChart outside ChartContainer gets
    // a clear error rather than a silent undefined context.
    const chartSrc = read('src/components/ui/chart.jsx')
    expect(chartSrc).toMatch(/useChart must be used within a ChartContainer/)
  })
})
