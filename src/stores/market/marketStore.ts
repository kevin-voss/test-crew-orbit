import { create } from "zustand";
import type { PersistStorage, StorageValue } from "zustand/middleware";
import { persist } from "zustand/middleware";

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
  portfolioEquityHistory: [],
  referenceEquity: DEFAULT_INITIAL_CASH,
  equityDayKey: null,
  dayOpenEquity: DEFAULT_INITIAL_CASH,
});

function clampHistory(series: MarketStoreData["marketHistory"][string]): typeof series {
  const max = 5_000;
  if (series.length <= max) return series;
  return series.slice(-max);
}

function clampEquitySeries(series: EquityPoint[]): EquityPoint[] {
  if (series.length <= MARKET_ENGINE_HISTORY_MAX) return series;
  return series.slice(-MARKET_ENGINE_HISTORY_MAX);
}

function createActions(
  set: (partial: Partial<MarketStoreState> | ((s: MarketStoreState) => Partial<MarketStoreState>)) => void,
  _get: () => MarketStoreState,
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
          const lastPt = state.portfolioEquityHistory.at(-1);
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
          dayOpenEquity =
            state.portfolioEquityHistory.at(-1)?.equity ?? state.dayOpenEquity ?? equity;
        }

        const portfolioEquityHistory = clampEquitySeries([
          ...state.portfolioEquityHistory,
          { t: tSample, equity },
        ]);

        return {
          prices,
          marketHistory,
          portfolioEquityHistory,
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
        const lastT = state.portfolioEquityHistory.at(-1)?.t ?? 0;
        const portfolioEquityHistory = clampEquitySeries([
          ...state.portfolioEquityHistory,
          { t: lastT + 1, equity },
        ]);
        return { cash, positions, tradeHistory, portfolioEquityHistory };
      });
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
    portfolioEquityHistory: state.portfolioEquityHistory,
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
        const portfolioEquityHistory = Array.isArray(p.portfolioEquityHistory)
          ? (p.portfolioEquityHistory as EquityPoint[])
          : d.portfolioEquityHistory;
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
          portfolioEquityHistory,
          referenceEquity,
          equityDayKey,
          dayOpenEquity,
        };
      },
    },
  ),
);
