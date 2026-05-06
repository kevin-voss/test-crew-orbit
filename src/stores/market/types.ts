/** Single position line; quantities and averages are supplied by the market engine. */
export type Holding = {
  shares: number;
  /** Optional cost basis line item from the engine (store does not compute it). */
  averageCost?: number;
};

export type TradeRecord = {
  id: string;
  ticker: string;
  side: "buy" | "sell";
  shares: number;
  pricePerShare: number;
  timestamp: number;
};

/** Precomputed execution outcome from the market engine — no fills or P&L math in the store. */
export type TradeExecutionResult = {
  trade: TradeRecord;
  nextCash: number;
  /** Full post-trade positions map (omit tickers with zero shares). */
  positions: Record<string, Holding>;
};

export type PricePoint = {
  t: number;
  price: number;
};

/** Portfolio mark-to-market total at a logical tick time (charting only; domain math stays out of UI modules). */
export type EquityPoint = {
  t: number;
  equity: number;
};

export type MarketTickPayload = {
  /** Latest prices keyed by ticker (replace or merge entry per ticker). */
  prices: Partial<Record<string, number>>;
  /** Optional OHLC/stream point to append for chart continuity after refresh. */
  historySamples?: Array<{
    ticker: string;
    point: PricePoint;
  }>;
};

export type MarketStoreData = {
  cash: number;
  positions: Record<string, Holding>;
  tradeHistory: TradeRecord[];
  /** Time series per ticker for dashboards that survive refresh */
  marketHistory: Record<string, PricePoint[]>;
  selectedTicker: string | null;
  prices: Record<string, number>;
  /** Rolling equity samples for the equity curve (updated on ticks and fills). */
  portfolioEquityHistory: EquityPoint[];
  /** Baseline total portfolio value for ROI / total P&L (set at hydration if absent). */
  referenceEquity: number;
  /** Local calendar day key (`Date#toDateString`) for Day P&L anchoring. */
  equityDayKey: string | null;
  /** Equity at the start of the current `equityDayKey` (mark-to-market). */
  dayOpenEquity: number;
};

export type MarketStoreActions = {
  applyMarketTick: (payload: MarketTickPayload) => void;
  applyTradeResult: (result: TradeExecutionResult) => void;
  setSelectedTicker: (ticker: string | null) => void;
};

export type MarketStoreState = MarketStoreData & MarketStoreActions;
