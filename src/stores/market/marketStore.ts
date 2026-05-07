import { create } from "zustand";
import type { PersistStorage, StorageValue } from "zustand/middleware";
import { persist } from "zustand/middleware";

import { simulateTradeExecution } from "../../market/simulateTradeExecution";
import { MARKET_ENGINE_HISTORY_MAX } from "../../utils/marketEngine";
import { computeMarkToMarketEquity } from "../../utils/portfolioEquity";
import type {
  EquityPoint,
  MarketStoreActions,
  MarketStoreData,
  MarketStoreState,
  MarketTickPayload,
  TradeExecutionResult,
} from "./types";

/** Default cash when no persisted session exists */
export const DEFAULT_INITIAL_CASH = 100_000;

export const MARKET_STORE_STORAGE_KEY = "sim-market-store-v1";

type PersistedSlice = Partial<MarketStoreData>;

/** Non-array plain objects suitable for keyed maps in persisted state */
function isRecordMap(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getLocalLikeStorage(): Pick<Storage, "getItem" | "removeItem" | "setItem"> | null {
  try {
    if (typeof globalThis === "object" && globalThis !== null && "localStorage" in globalThis) {
      const ls = (globalThis as unknown as { localStorage?: Storage }).localStorage;
      if (ls && typeof ls.getItem === "function") return ls;
    }
  } catch {
    return null;
  }
  return null;
}

/** Resolves `localStorage` on each call so tests (and lazy browser init) attach `persist` reliably. */
function createLazySessionStorage(): PersistStorage<PersistedSlice> {
  return {
    getItem: (name) => {
      const ls = getLocalLikeStorage();
      if (!ls) return null;
      try {
        const raw = ls.getItem(name);
        if (raw == null) return null;
        return JSON.parse(raw) as StorageValue<PersistedSlice>;
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      const ls = getLocalLikeStorage();
      if (!ls) return;
      try {
        ls.setItem(name, JSON.stringify(value));
      } catch {
        /* QuotaExceeded / private mode */
      }
    },
    removeItem: (name) => {
      const ls = getLocalLikeStorage();
      if (!ls) return;
      try {
        ls.removeItem(name);
      } catch {
        /* ignore */
      }
    },
  };
}

const defaultData = (): MarketStoreData => ({
  cash: DEFAULT_INITIAL_CASH,
  positions: {},
  tradeHistory: [],
  marketHistory: {},
  selectedTicker: null,
  prices: {},
  equityHistory: [],
  referenceEquity: DEFAULT_INITIAL_CASH,
  equityDayKey: null,
  dayOpenEquity: DEFAULT_INITIAL_CASH,
});

function clampHistory(series: MarketStoreData["marketHistory"][string]): typeof series {
  const max = 5_000;
  if (series.length <= max) return series;
  return series.slice(-max);
}

function clampEquityHistory(series: EquityPoint[]): EquityPoint[] {
  if (series.length <= MARKET_ENGINE_HISTORY_MAX) return series;
  return series.slice(-MARKET_ENGINE_HISTORY_MAX);
}

/** Appends `{ t, equity }`, clamping length; duplicate `t` replaces the prior row (last-write-wins). */
function appendEquityHistory(prev: EquityPoint[], point: EquityPoint): EquityPoint[] {
  const last = prev.at(-1);
  const base =
    last && last.t === point.t ? [...prev.slice(0, -1), point] : [...prev, point];
  return clampEquityHistory(base);
}

function createActions(
  set: (partial: Partial<MarketStoreState> | ((s: MarketStoreState) => Partial<MarketStoreState>)) => void,
  get: () => MarketStoreState,
): MarketStoreActions {
  return {
    applyMarketTick: (payload: MarketTickPayload) => {
      set((state) => {
        const prices = { ...state.prices };
        for (const [ticker, price] of Object.entries(payload.prices)) {
          if (typeof price === "number" && Number.isFinite(price)) {
            prices[ticker] = price;
          }
        }

        const marketHistory = { ...state.marketHistory };
        if (payload.historySamples?.length) {
          for (const { ticker, point } of payload.historySamples) {
            if (!Number.isFinite(point.price)) continue;
            const prev = marketHistory[ticker] ?? [];
            marketHistory[ticker] = clampHistory([...prev, point]);
          }
        }

        const equity = computeMarkToMarketEquity(state.cash, state.positions, prices);

        let tSample: number;
        if (payload.historySamples?.length) {
          tSample = Math.max(...payload.historySamples.map((h) => h.point.t));
        } else {
          const lastPt = state.equityHistory.at(-1);
          tSample = (lastPt?.t ?? 0) + 1;
        }

        const dk = new Date().toDateString();
        let equityDayKey = state.equityDayKey;
        let dayOpenEquity = state.dayOpenEquity;

        if (equityDayKey == null) {
          equityDayKey = dk;
          dayOpenEquity = equity;
        } else if (equityDayKey !== dk) {
          equityDayKey = dk;
          dayOpenEquity = state.equityHistory.at(-1)?.equity ?? state.dayOpenEquity ?? equity;
        }

        const equityHistory = appendEquityHistory(state.equityHistory, { t: tSample, equity });

        return {
          prices,
          marketHistory,
          equityHistory,
          equityDayKey,
          dayOpenEquity,
        };
      });
    },

    applyTradeResult: (result: TradeExecutionResult) => {
      set((state) => {
        const cash = result.nextCash;
        const positions = { ...result.positions };
        const tradeHistory = [result.trade, ...state.tradeHistory];
        const equity = computeMarkToMarketEquity(cash, positions, state.prices);
        const tTrade = result.trade.timestamp;
        const equityHistory = appendEquityHistory(state.equityHistory, { t: tTrade, equity });
        return { cash, positions, tradeHistory, equityHistory };
      });
    },

    submitSpotTrade: ({ side, quantity }) => {
      const state = get();
      const ticker = state.selectedTicker;
      if (ticker == null) {
        return {
          ok: false as const,
          error: {
            code: "NO_TICKER",
            message: "Select a ticker from the market list before trading.",
          },
        };
      }
      const livePrice = state.prices[ticker];
      if (typeof livePrice !== "number" || !Number.isFinite(livePrice) || livePrice <= 0) {
        return {
          ok: false as const,
          error: {
            code: "NO_PRICE",
            message: "No simulated price is available for this symbol yet.",
          },
        };
      }
      const outcome = simulateTradeExecution({
        cash: state.cash,
        positions: state.positions,
        ticker,
        side,
        quantity,
        pricePerShare: livePrice,
      });
      if (!outcome.ok) return outcome;
      get().applyTradeResult(outcome.result);
      return { ok: true as const, result: outcome.result };
    },

    setSelectedTicker: (ticker) => set({ selectedTicker: ticker }),
  };
}

function buildPersistedSlice(state: MarketStoreState): Partial<MarketStoreData> {
  return {
    cash: state.cash,
    positions: state.positions,
    tradeHistory: state.tradeHistory,
    marketHistory: state.marketHistory,
    selectedTicker: state.selectedTicker,
    prices: state.prices,
    equityHistory: state.equityHistory,
    referenceEquity: state.referenceEquity,
    equityDayKey: state.equityDayKey,
    dayOpenEquity: state.dayOpenEquity,
  };
}

/**
 * Persisted client store for simulated trading dashboards.
 * Hydration helpers live on `useMarketStore.persist` (Zustand).
 */
export const useMarketStore = create<MarketStoreState>()(
  persist(
    (set, get) => ({
      ...defaultData(),
      ...createActions(set, get),
    }),
    {
      name: MARKET_STORE_STORAGE_KEY,
      storage: createLazySessionStorage(),
      partialize: buildPersistedSlice,
      merge: (persisted, current) => {
        const p = persisted as Partial<MarketStoreData> | undefined;
        const d = defaultData();
        if (!p || typeof p !== "object") {
          return { ...current };
        }
        const cash = typeof p.cash === "number" && Number.isFinite(p.cash) ? p.cash : d.cash;
        const positions = isRecordMap(p.positions) ? (p.positions as MarketStoreData["positions"]) : d.positions;
        const prices = isRecordMap(p.prices) ? (p.prices as MarketStoreData["prices"]) : d.prices;
        const mtm = computeMarkToMarketEquity(cash, positions, prices);
        const referenceEquity =
          typeof p.referenceEquity === "number" && Number.isFinite(p.referenceEquity)
            ? p.referenceEquity
            : mtm;
        let equityHistory: EquityPoint[];
        if (Array.isArray(p.equityHistory)) {
          equityHistory = p.equityHistory as EquityPoint[];
        } else if (Array.isArray((p as { portfolioEquityHistory?: unknown }).portfolioEquityHistory)) {
          equityHistory = (p as { portfolioEquityHistory: EquityPoint[] }).portfolioEquityHistory;
        } else {
          equityHistory = d.equityHistory;
        }
        const equityDayKey =
          typeof p.equityDayKey === "string" || p.equityDayKey === null ? p.equityDayKey : d.equityDayKey;
        const dayOpenEquity =
          typeof p.dayOpenEquity === "number" && Number.isFinite(p.dayOpenEquity) ? p.dayOpenEquity : referenceEquity;

        return {
          ...current,
          cash,
          positions,
          tradeHistory: Array.isArray(p.tradeHistory) ? p.tradeHistory : d.tradeHistory,
          marketHistory: isRecordMap(p.marketHistory)
            ? (p.marketHistory as MarketStoreData["marketHistory"])
            : d.marketHistory,
          selectedTicker:
            typeof p.selectedTicker === "string" || p.selectedTicker === null
              ? p.selectedTicker
              : d.selectedTicker,
          prices,
          equityHistory,
          referenceEquity,
          equityDayKey,
          dayOpenEquity,
        };
      },
    },
  ),
);
