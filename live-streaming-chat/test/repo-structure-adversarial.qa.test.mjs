/**
 * QA adversarial / stress checks for scaffold layout — not duplicate of happy-path acceptance.
 * Validates isolation, concurrency, config integrity, path boundaries.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHAT_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(CHAT_ROOT, '..');

const SKIP_REPO_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'target',
  '.cursor',
]);

/** Recursive .java crawl without ripgrep (portable QA). */
async function collectJavaFiles(rootDir) {
  const files = [];

  async function walk(dir) {
    let ents;
    try {
      ents = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of ents) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (SKIP_REPO_DIRS.has(ent.name)) continue;
        await walk(full);
      } else if (ent.isFile() && ent.name.endsWith('.java')) {
        files.push(full);
      }
    }
  }

  await walk(rootDir);
  return files;
}

function mustStayInsideParent(resolvedChild, resolvedParent, label) {
  const rel = path.relative(resolvedParent, resolvedChild);
  assert.ok(!rel.startsWith('..') && path.isAbsolute(rel) === false, label);
}

test.describe('QA — concurrency & resource churn (filesystem)', async () => {
  test('parallel stat/read storm remains consistent — no flaky missing root', async () => {
    // QA risk (AC-adjacent): TOCTOU / flaky CI if tree is unstable — structure should hold under parallel access
    const n = 200;
    const stats = await Promise.all(
      Array.from({ length: n }, () =>
        Promise.all([
          fs.stat(CHAT_ROOT),
          fs.stat(path.join(CHAT_ROOT, 'frontend')),
          fs.stat(path.join(CHAT_ROOT, 'backend')),
        ]),
      ),
    );
    for (const triplet of stats) {
      assert.equal(triplet[0].isDirectory(), true);
      assert.equal(triplet[1].isDirectory(), true);
      assert.equal(triplet[2].isDirectory(), true);
    }
  });

  test('parallel repeated reads of package.json yield identical parse trees', async () => {
    // QA stress: repeated parse under load — catches partial writes / locking mistakes in tooling
    const pkgPath = path.join(CHAT_ROOT, 'frontend', 'package.json');
    const reads = await Promise.all(
      Array.from({ length: 120 }, () => fs.readFile(pkgPath, 'utf8')),
    );
    const first = JSON.parse(reads[0]);
    for (const raw of reads) {
      assert.deepEqual(JSON.parse(raw), first);
    }
  });
});

test.describe('QA — path traversal & canonicalization boundaries', async () => {
  test('resolved frontend path cannot escape chat root via dot segments', () => {
    // QA boundary: hostile relative paths must not normalize outside scaffold
    const fe = path.resolve(CHAT_ROOT, 'frontend', '..', '..', 'live-streaming-chat', 'frontend');
    mustStayInsideParent(fe, CHAT_ROOT, 'frontend escaped chat root');
    const backAtRepo = path.resolve(CHAT_ROOT, 'frontend', '..', '..');
    assert.equal(path.resolve(backAtRepo), path.resolve(REPO_ROOT));
  });

  test('real chat root stays within repo root', async () => {
    const real = await fs.realpath(CHAT_ROOT);
    mustStayInsideParent(real, REPO_ROOT, 'chat folder not under repository root');
  });
});

test.describe('QA — malformed / hostile config resilience', async () => {
  test('components.json is strict JSON (no BOM-only surprise, no trailing garbage)', () => {
    // QA malformed input: editors sometimes add BOM or duplicate JSON — build/tooling breaks silently
    const p = path.join(CHAT_ROOT, 'frontend', 'components.json');
    const raw = readFileSync(p, 'utf8');
    assert.ok(!raw.startsWith('\ufeff'), 'components.json must not contain UTF-8 BOM before shadcn tooling');
    assert.doesNotThrow(() => JSON.parse(raw));
    const doc = JSON.parse(raw);
    assert.equal(doc.tsx, false, 'story requires JavaScript shadcn setup (tsx:false)');
  });

  test('frontend package.json rejects obvious lifecycle exfiltration scripts', () => {
    const pkg = JSON.parse(
      readFileSync(path.join(CHAT_ROOT, 'frontend', 'package.json'), 'utf8'),
    );
    const scripts = pkg.scripts ?? {};
    for (const [name, cmd] of Object.entries(scripts)) {
      assert.ok(
        typeof cmd === 'string',
        `script ${name} must be string for supply-chain clarity`,
      );
      assert.ok(
        !/\b(curl|wget|bash\s+-c|eval)\b/i.test(cmd),
        `script "${name}" contains high-risk tokens: ${cmd}`,
      );
    }
  });
});

test.describe('QA — isolation of chat scaffold (cross-package leak)', async () => {
  test('Java package marker only appears under live-streaming-chat/', async () => {
    // Supports traceability for layout isolation vs AC-1 (repo-wide crawl, distinct from minimal existence checks)
    const javaPaths = await collectJavaFiles(REPO_ROOT);
    const hits = [];
    for (const file of javaPaths) {
      const src = await fs.readFile(file, 'utf8');
      if (/^\s*package\s+com\.livestreamingchat\s*;/m.test(src)) {
        hits.push(file);
      }
    }
    assert.ok(hits.length > 0, 'expected at least one com.livestreamingchat compilation unit');
    for (const file of hits) {
      assert.ok(
        file.startsWith(CHAT_ROOT + path.sep),
        `leaked Java package declaration outside chat folder: ${file}`,
      );
    }
  });

  test('Spring Boot artifact coordinates not duplicated at repository root pom', async () => {
    const rootPom = path.join(REPO_ROOT, 'pom.xml');
    let hasRoot = false;
    try {
      await fs.access(rootPom);
      hasRoot = true;
    } catch {
      hasRoot = false;
    }
    if (hasRoot) {
      const xml = readFileSync(rootPom, 'utf8');
      assert.ok(
        !xml.includes('<artifactId>backend</artifactId>') ||
          xml.includes('live-streaming-chat'),
        'root pom must not accidentally embed chat backend artifact without monorepo intent',
      );
    }
  });
});

test.describe('QA — backend static contract (no JVM required)', () => {
  test('application.properties declares in-memory H2 with stable close flags', () => {
    // Supports AC-2 backend place + later sub-stories — static check when mvn blocked
    const ap = readFileSync(
      path.join(CHAT_ROOT, 'backend', 'src', 'main', 'resources', 'application.properties'),
      'utf8',
    );
    assert.match(ap, /jdbc:h2:mem:/);
    assert.match(ap, /DB_CLOSE_DELAY=-1/);
    assert.match(ap, /org\.h2\.Driver/);
  });

  test('pom.xml lists H2 runtime and Spring Data JPA for future sub-story', () => {
    const pom = readFileSync(path.join(CHAT_ROOT, 'backend', 'pom.xml'), 'utf8');
    assert.match(pom, /<artifactId>h2<\/artifactId>/);
    assert.match(pom, /spring-boot-starter-data-jpa/);
  });
});
