import { create } from "zustand";
import { persist } from "zustand/middleware";

import { simTradingPersistStorage } from "@/stores/storage";
import {
  HISTORY_CAP_PER_SYMBOL,
  TICK_INTERVAL_MS,
  advanceAllSymbolsGbm,
  defaultInstruments,
  trimHistory,
  type PricePoint,
} from "@/utils/marketEngine";

const INITIAL_CASH = 100_000;

type TradeRecord = {
  id: string;
  ts: number;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
};

export type EquityPoint = { t: number; value: number };

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function seededLastPrices(): Record<string, number> {
  return Object.fromEntries(
    defaultInstruments().map((i) => [i.symbol, i.lastPrice]),
  );
}

function portfolioEquity(
  cash: number,
  positions: Record<string, number>,
  prices: Record<string, number>,
): number {
  let m = 0;
  for (const [sym, qty] of Object.entries(positions)) {
    m += qty * (prices[sym] ?? 0);
  }
  return cash + m;
}

type BaseSlice = {
  cash: number;
  positionsBySymbol: Record<string, number>;
  priceHistoryBySymbol: Record<string, PricePoint[]>;
  tradeLog: TradeRecord[];
  equityHistory: EquityPoint[];
  lastPriceBySymbol: Record<string, number>;
  priorTickPriceBySymbol: Record<string, number>;
  selectedSymbol: string;
  version: number;
  dayKey: string;
  equityAtDayStart: number;
  _hasHydrated: boolean;
};

export type MarketActions = {
  buy: (args: { symbol: string; quantity: number }) => void;
  sell: (args: { symbol: string; quantity: number }) => void;
  setSelectedSymbol: (symbol: string) => void;
  applyMarketTick: () => void;
  resetToFirstRun: () => void;
  seedBroke: (args: { symbol: string; lastPrice: number }) => void;
  maxBuyFor: (symbol: string) => number;
};

export type MarketStore = BaseSlice & MarketActions;

function buildFreshSlice(): BaseSlice {
  const lastPriceBySymbol = seededLastPrices();
  const today = dayKey(Date.now());
  return {
    cash: INITIAL_CASH,
    positionsBySymbol: {},
    priceHistoryBySymbol: {},
    tradeLog: [],
    equityHistory: [],
    lastPriceBySymbol,
    priorTickPriceBySymbol: { ...lastPriceBySymbol },
    selectedSymbol: defaultInstruments()[0]!.symbol,
    version: 1,
    dayKey: today,
    equityAtDayStart: INITIAL_CASH,
    _hasHydrated: false,
  };
}

export const useMarketStore = create<MarketStore>()(
  persist(
    (set, get) => ({
      ...buildFreshSlice(),
      setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
      maxBuyFor: (symbol) => {
        const price = get().lastPriceBySymbol[symbol];
        if (price == null || price <= 0) return 0;
        return Math.floor(get().cash / price);
      },
      seedBroke: ({ symbol, lastPrice }) =>
        set({
          lastPriceBySymbol: { ...get().lastPriceBySymbol, [symbol]: lastPrice },
        }),
      resetToFirstRun: () => set(buildFreshSlice()),
      buy: ({ symbol, quantity }) => {
        if (!Number.isInteger(quantity) || quantity <= 0) {
          throw new Error("invalid quantity");
        }
        const price = get().lastPriceBySymbol[symbol];
        if (price == null || price <= 0) throw new Error("unknown symbol");
        const max = get().maxBuyFor(symbol);
        if (quantity > max) throw new Error("insufficient cash");
        const cost = quantity * price;
        set({
          cash: get().cash - cost,
          positionsBySymbol: {
            ...get().positionsBySymbol,
            [symbol]: (get().positionsBySymbol[symbol] ?? 0) + quantity,
          },
          tradeLog: [
            ...get().tradeLog,
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
              ts: Date.now(),
              symbol,
              side: "buy",
              quantity,
              price,
            },
          ],
        });
      },
      sell: ({ symbol, quantity }) => {
        if (!Number.isInteger(quantity) || quantity <= 0) {
          throw new Error("invalid quantity");
        }
        const held = get().positionsBySymbol[symbol] ?? 0;
        if (quantity > held) throw new Error("insufficient shares");
        const price = get().lastPriceBySymbol[symbol];
        if (price == null || price <= 0) throw new Error("unknown symbol");
        const nextQty = held - quantity;
        const nextPos = { ...get().positionsBySymbol };
        if (nextQty === 0) delete nextPos[symbol];
        else nextPos[symbol] = nextQty;
        set({
          cash: get().cash + quantity * price,
          positionsBySymbol: nextPos,
          tradeLog: [
            ...get().tradeLog,
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
              ts: Date.now(),
              symbol,
              side: "sell",
              quantity,
              price,
            },
          ],
        });
      },
      applyMarketTick: () => {
        const state = get();
        const instruments = defaultInstruments().map((row) => ({
          ...row,
          lastPrice:
            state.lastPriceBySymbol[row.symbol] ?? row.lastPrice,
        }));
        const prior = { ...state.lastPriceBySymbol };
        const nextPrices = advanceAllSymbolsGbm({
          pricesBySymbol: state.lastPriceBySymbol,
          instruments,
          dtSeconds: TICK_INTERVAL_MS / 1000,
        });
        const now = Date.now();
        const nextHistories = { ...state.priceHistoryBySymbol };
        for (const [sym, px] of Object.entries(nextPrices)) {
          const merged = [...(nextHistories[sym] ?? []), { t: now, price: px }];
          nextHistories[sym] = trimHistory(merged, HISTORY_CAP_PER_SYMBOL);
        }
        const equity = portfolioEquity(
          state.cash,
          state.positionsBySymbol,
          nextPrices,
        );
        let nextDayKey = state.dayKey;
        let nextEqDayStart = state.equityAtDayStart;
        const dk = dayKey(now);
        if (dk !== state.dayKey) {
          nextDayKey = dk;
          nextEqDayStart = equity;
        }
        const nextEquityHistory = trimHistory(
          [...state.equityHistory, { t: now, value: equity }],
          800,
        );
        set({
          priorTickPriceBySymbol: prior,
          lastPriceBySymbol: nextPrices,
          priceHistoryBySymbol: nextHistories,
          equityHistory: nextEquityHistory,
          dayKey: nextDayKey,
          equityAtDayStart: nextEqDayStart,
        });
      },
    }),
    {
      name: "sim-trading-storage",
      storage: simTradingPersistStorage,
      partialize: (s) => ({
        cash: s.cash,
        positionsBySymbol: s.positionsBySymbol,
        priceHistoryBySymbol: s.priceHistoryBySymbol,
        tradeLog: s.tradeLog,
        equityHistory: s.equityHistory,
        version: s.version,
        selectedSymbol: s.selectedSymbol,
        lastPriceBySymbol: s.lastPriceBySymbol,
        priorTickPriceBySymbol: s.priorTickPriceBySymbol,
        dayKey: s.dayKey,
        equityAtDayStart: s.equityAtDayStart,
      }),
    },
  ),
);

useMarketStore.persist.onFinishHydration(() => {
  useMarketStore.setState({ _hasHydrated: true });
});
