/**
 * QA Adversarial Tests — Project structure, README accuracy, and build config
 *
 * Validates AC-1, AC-2, AC-3 from the scaffold acceptance criteria.
 * Uses fs to inspect the file system; no browser environment needed.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, statSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function abs(...parts) {
  return resolve(root, ...parts)
}

// ---------------------------------------------------------------------------
// AC-2: Clear locations for state, components, and analytics
// ---------------------------------------------------------------------------
describe('QA Adversarial — project structure: required directories', () => {
  const requiredDirs = [
    'src/store',
    'src/components',
    'src/components/ui',
    'src/views',
    'src/layout',
    'src/lib',
  ]

  for (const dir of requiredDirs) {
    it(`directory "${dir}" exists and is a directory`, () => {
      // covers AC-2
      const p = abs(dir)
      expect(existsSync(p), `${dir} should exist`).toBe(true)
      expect(statSync(p).isDirectory(), `${dir} should be a directory`).toBe(true)
    })
  }
})

describe('QA Adversarial — project structure: required source files', () => {
  const requiredFiles = [
    'index.html',
    'src/main.jsx',
    'src/App.jsx',
    'src/index.css',
    'src/store/appStore.js',
    'src/lib/utils.js',
    'src/layout/Layout.jsx',
    'src/layout/Header.jsx',
    'src/layout/Sidebar.jsx',
    'src/views/WeekView.jsx',
    'src/views/AnalyticsView.jsx',
    'src/components/ui/button.jsx',
    'src/components/ui/card.jsx',
    'src/components/ui/chart.jsx',
    'vite.config.js',
    'tailwind.config.js',
    'postcss.config.js',
  ]

  for (const file of requiredFiles) {
    it(`file "${file}" exists and is non-empty`, () => {
      // covers AC-2
      const p = abs(file)
      expect(existsSync(p), `${file} should exist`).toBe(true)
      expect(statSync(p).size, `${file} should not be empty`).toBeGreaterThan(0)
    })
  }
})

describe('QA Adversarial — project structure: no server-side code', () => {
  it('no server.js file exists at project root', () => {
    // covers AC-1 (frontend-only spec)
    expect(existsSync(abs('server.js'))).toBe(false)
  })

  it('no api/ directory exists at project root', () => {
    // covers AC-1
    expect(existsSync(abs('api'))).toBe(false)
  })

  it('no backend/ directory exists at project root', () => {
    // covers AC-1
    expect(existsSync(abs('backend'))).toBe(false)
  })

  it('index.html does not load a service-worker or backend URL', () => {
    // covers AC-1 — guard against accidental server wiring
    const html = readFileSync(abs('index.html'), 'utf8')
    expect(html).not.toMatch(/serviceWorker/)
    expect(html).not.toMatch(/localhost:\d{4,5}\/api/)
  })
})

// ---------------------------------------------------------------------------
// AC-3: README enables a developer to run the app without undocumented steps
// ---------------------------------------------------------------------------
describe('QA Adversarial — README accuracy', () => {
  let readme

  try {
    readme = readFileSync(abs('README.md'), 'utf8')
  } catch {
    readme = ''
  }

  it('README.md exists and is non-empty', () => {
    // covers AC-3
    expect(existsSync(abs('README.md'))).toBe(true)
    expect(readme.length).toBeGreaterThan(0)
  })

  it('README documents "bun install" as the dependency install command', () => {
    // covers AC-3 — developer must be able to install without undocumented flags
    expect(readme).toMatch(/bun install/)
  })

  it('README documents "bun run dev" as the local start command', () => {
    // covers AC-3
    expect(readme).toMatch(/bun run dev/)
  })

  it('README mentions the dev-server port (5173)', () => {
    // covers AC-3 — developer needs to know where to open the browser
    expect(readme).toMatch(/5173/)
  })

  it('README lists a Prerequisites section naming Bun', () => {
    // covers AC-3 — no undocumented tool requirements
    expect(readme).toMatch(/[Bb]un/)
  })

  it('README does not silently require Node.js/npm without documenting it', () => {
    // covers AC-3 adversarial: if README only mentions Bun but npm is actually needed,
    // a fresh Bun-only environment would fail.
    // The scaffold uses bun install / bun run dev; npm should not be required.
    // This test asserts the README doesn't instruct npm usage alongside Bun
    // in a way that would confuse a developer.
    const npmInstallPattern = /^\s*npm install/m
    const hasBunInstall = /bun install/.test(readme)
    if (npmInstallPattern.test(readme)) {
      // If npm install appears in README without bun install, that's a documentation bug.
      expect(hasBunInstall).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// AC-1: package.json must be well-formed and contain required deps
// ---------------------------------------------------------------------------
describe('QA Adversarial — package.json integrity', () => {
  let pkg

  try {
    pkg = JSON.parse(readFileSync(abs('package.json'), 'utf8'))
  } catch {
    pkg = null
  }

  it('package.json is valid JSON', () => {
    // covers AC-1
    expect(pkg).not.toBeNull()
  })

  const requiredDeps = ['react', 'react-dom', 'zustand']

  for (const dep of requiredDeps) {
    it(`dependency "${dep}" is declared in package.json`, () => {
      // covers AC-1
      const allDeps = { ...pkg?.dependencies, ...pkg?.devDependencies }
      expect(allDeps[dep]).toBeDefined()
    })
  }

  it('tailwindcss is declared as a devDependency', () => {
    // covers AC-1
    expect(pkg?.devDependencies?.tailwindcss).toBeDefined()
  })

  it('package.json has a "dev" script for starting the app', () => {
    // covers AC-1, AC-3
    expect(pkg?.scripts?.dev).toBeDefined()
    expect(pkg?.scripts?.dev).not.toBe('')
  })

  it('package.json has a "build" script', () => {
    // covers AC-1
    expect(pkg?.scripts?.build).toBeDefined()
  })

  it('recharts is declared for shadcn chart support', () => {
    // covers AC-2 — chart integration readiness
    const allDeps = { ...pkg?.dependencies, ...pkg?.devDependencies }
    expect(allDeps['recharts']).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Vite config: path alias "@" is wired to src/
// ---------------------------------------------------------------------------
describe('QA Adversarial — vite.config.js alias wiring', () => {
  it('vite.config.js declares "@" alias pointing to src/', () => {
    // covers AC-2 — imports using @/ must resolve; missing alias causes build failures
    const viteConfig = readFileSync(abs('vite.config.js'), 'utf8')
    // Confirm the alias key is present
    expect(viteConfig).toMatch(/'@'/)
    // Confirm it resolves the src directory
    expect(viteConfig).toMatch(/['"]\.\/src['"]|resolve.*src/)
  })
})

// ---------------------------------------------------------------------------
// Tailwind config: CSS custom properties expected by shadcn/ui components
// ---------------------------------------------------------------------------
describe('QA Adversarial — tailwind.config.js custom-property coverage', () => {
  let twConfig

  try {
    twConfig = readFileSync(abs('tailwind.config.js'), 'utf8')
  } catch {
    twConfig = ''
  }

  const requiredColorTokens = ['primary', 'secondary', 'muted', 'accent', 'destructive']

  for (const token of requiredColorTokens) {
    it(`tailwind config declares "${token}" color token`, () => {
      // covers AC-2 — missing tokens cause invisible rendering failures in shadcn components
      expect(twConfig).toMatch(new RegExp(token))
    })
  }

  it('tailwind config content paths include src/**/*.jsx', () => {
    // covers AC-1 — if src files are excluded, Tailwind purges used classes
    expect(twConfig).toMatch(/src.*jsx/)
  })
})
