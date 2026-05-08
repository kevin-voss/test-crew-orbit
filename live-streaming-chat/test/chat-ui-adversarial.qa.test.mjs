/**
 * QA adversarial tests for chat UI logic & resilience (non–happy-path; does not duplicate AC flow tests).
 * Targets: merge semantics, malformed timeline data, concurrency on pure merge, static async error bounds.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHAT_ROOT = path.resolve(__dirname, '..');
const CHAT_JSX = path.join(CHAT_ROOT, 'frontend', 'src', 'components', 'Chat.jsx');

/** Mirrors `mergeMessages` in Chat.jsx — keep aligned when production algorithm changes. */
function mergeMessages(prev, incoming) {
  const map = new Map(prev.map((m) => [m.id, m]));
  map.set(incoming.id, incoming);
  return Array.from(map.values()).sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    if (ta !== tb) return ta - tb;
    return a.id - b.id;
  });
}

/** Slice inner statements of a `{...}` block starting at `openIdx` (must point at `{`). */
function innerBlockContent(source, openIdx) {
  assert.equal(source[openIdx], '{');
  let depth = 0;
  for (let i = openIdx; i < source.length; i++) {
    const c = source[i];
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(openIdx + 1, i);
      }
    }
  }
  throw new Error('unbalanced braces in Chat.jsx slice');
}

function innerBodyLoadHistory(source) {
  const sig = 'const loadHistory = useCallback(async () => {';
  const i = source.indexOf(sig);
  assert.ok(i >= 0, 'Chat.jsx must define loadHistory');
  const openBrace = i + sig.length - 1;
  return innerBlockContent(source, openBrace);
}

function innerBodyHandleSubmit(source) {
  const sig = 'async function handleSubmit(e) {';
  const i = source.indexOf(sig);
  assert.ok(i >= 0, 'Chat.jsx must define handleSubmit');
  const openBrace = i + sig.length - 1;
  return innerBlockContent(source, openBrace);
}

test.describe('QA — mergeMessages boundary & concurrency (oracle)', () => {
  test('replacing same id keeps single row with newest payload', () => {
    const a = { id: 1, content: 'old', createdAt: '2026-01-01T00:00:00.000Z' };
    const b = { id: 1, content: 'new', createdAt: '2026-01-02T00:00:00.000Z' };
    const out = mergeMessages([a], b);
    assert.equal(out.length, 1);
    assert.equal(out[0].content, 'new');
  });

  test('stable tie-break on identical timestamps uses numeric id', () => {
    const t = '2026-05-08T12:00:00.000Z';
    const out = mergeMessages(
      [
        { id: 10, content: 'b', createdAt: t },
        { id: 2, content: 'a', createdAt: t },
      ],
      { id: 5, content: 'mid', createdAt: t },
    );
    const ids = out.map((m) => m.id);
    assert.deepEqual(ids, [2, 5, 10]);
  });

  test('concurrent mergeMessages calls from Promise.all do not throw (pure function stress)', async () => {
    const base = Array.from({ length: 400 }, (_, i) => ({
      id: i,
      content: `m${i}`,
      createdAt: new Date(1_700_000_000_000 + i * 1000).toISOString(),
    }));
    const batch = await Promise.all(
      Array.from({ length: 200 }, (_, k) =>
        Promise.resolve(
          mergeMessages(base, {
            id: 10_000 + k,
            content: `x${k}`,
            createdAt: new Date().toISOString(),
          }),
        ),
      ),
    );
    assert.equal(batch.length, 200);
    for (const row of batch) {
      assert.ok(row.length >= base.length);
    }
  });

  test('fuzz random ids / timestamps never throws (adversarial input shape)', () => {
    let cur = [];
    for (let i = 0; i < 300; i += 1) {
      const id = Math.floor(Math.random() * 5000);
      const incoming = {
        id,
        content: `c${i}`,
        createdAt:
          Math.random() < 0.15
            ? 'not-a-valid-date'
            : new Date(Date.now() - Math.random() * 1e10).toISOString(),
      };
      assert.doesNotThrow(() => {
        cur = mergeMessages(cur, incoming);
      });
    }
    assert.ok(cur.length > 0);
  });

  test('large transcript merge completes within bounded time (resource churn)', () => {
    const prev = Array.from({ length: 8000 }, (_, i) => ({
      id: i,
      content: 'x',
      createdAt: new Date(1_700_000_000_000 + i).toISOString(),
    }));
    const t0 = performance.now();
    const out = mergeMessages(prev, {
      id: 99_999,
      content: 'tail',
      createdAt: new Date().toISOString(),
    });
    const ms = performance.now() - t0;
    assert.equal(out.length, 8001);
    assert.ok(ms < 500, `merge took ${ms}ms, expected <500ms for 8k rows`);
  });
});

test.describe('QA — Chat.jsx static resilience (malformed network / JSON)', () => {
  test('SSE handler tolerates malformed frames (try/catch around JSON.parse)', () => {
    const src = readFileSync(CHAT_JSX, 'utf8');
    assert.match(
      src,
      /onmessage\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]*?try\s*\{[\s\S]*?JSON\.parse\(/m,
      'SSE onmessage should wrap JSON.parse in try for malformed server events',
    );
  });

  test('submit ignores whitespace-only drafts', () => {
    const src = readFileSync(CHAT_JSX, 'utf8');
    assert.match(src, /draft\.trim\(\)/);
    assert.match(src, /if\s*\(\s*!content\s*\)\s*return/);
  });

  test('composer is bounded (DoS-ish paste)', () => {
    const src = readFileSync(CHAT_JSX, 'utf8');
    assert.match(src, /maxLength=\{2000\}/);
  });

  test('loadHistory: fetch + JSON parse should be in try/catch (isolated body, no spillover from SSE)', () => {
    const src = readFileSync(CHAT_JSX, 'utf8');
    const body = innerBodyLoadHistory(src);
    assert.ok(
      /try\s*\{[\s\S]*await fetch[\s\S]*\}\s*catch/.test(body),
      '[file: live-streaming-chat/frontend/src/components/Chat.jsx] function loadHistory: effect-driven history load uses bare await fetch / res.json(); network or malformed JSON can reject and bypass the SSE try/catch in a different hook',
    );
  });

  test('handleSubmit: outbound fetch should be inside try/catch (inner try around res.json only is insufficient)', () => {
    const src = readFileSync(CHAT_JSX, 'utf8');
    const body = innerBodyHandleSubmit(src);
    assert.ok(
      /try\s*\{[\s\S]*await fetch[\s\S]*\}\s*catch/.test(body),
      '[file: live-streaming-chat/frontend/src/components/Chat.jsx] function handleSubmit: await fetch is outside try/catch; connection errors produce unhandled rejections while inner try only guards res.json()',
    );
  });
});
