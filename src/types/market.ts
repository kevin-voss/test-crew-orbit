export type Instrument = {
  symbol: string;
  sigma: number;
  mu: number;
  lastPrice: number;
};

export type PricePoint = { t: number; price: number };

export type TickSnapshot = {
  prices: Record<string, number>;
  deltaSignBySymbol: Record<string, -1 | 0 | 1>;
};
