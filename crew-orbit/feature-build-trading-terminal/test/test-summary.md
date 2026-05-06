# Trading terminal — QA test summary

## Scope

Adversarial suite: `src/components/marketDashboard/TradingTerminal.qa.test.tsx` (QA-TT-\* scenarios). Does **not** repeat `TradingTerminal.acceptance.test.tsx` (AC-1–AC-16).

## Scenarios

| Id | Risk | Assertion |
|----|------|-----------|
| QA-TT-DBL | Double-submit / stale closure | One intentional share order must not fill twice in one `act` |
| QA-TT-TICKER-SWAP | Selection race | Trade uses `selectedTicker` at submit time |
| QA-TT-PRICE-INVALID-MID | Malformed price | NaN price blocks execution; store unchanged |
| QA-TT-MAXBUY-ZERO | Boundary cash &lt; price | Max buy 0; buy still rejected with feedback |
| QA-TT-MALFORMED-QTY | Bad quantity strings | `1.5`, `abc`, `0`, `-2` do not mutate store |
| QA-TT-HUGE-QTY | `MAX_SAFE_INTEGER` | Domain rejects; cash intact |
| QA-TT-NAN-CASH | Non-finite cash in store | Max buy 0; no trade from NaN cash path |
| QA-TT-TICK-STORM | Rapid ticks | No throw; Max Buy tracks last finite price |
| QA-TT-FUZZ-QTY | Hostile random strings | No accidental buys |

## Current result

- All QA-TT-\* scenarios **pass**, including `QA-TT-DBL`, after `TradingTerminal` gained a synchronous submit coalesce (`useRef` + `queueMicrotask` release on successful trade).

## Validation

Ran: `npm run typecheck`, `npm run test` (repo root).
