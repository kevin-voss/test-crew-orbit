"use client";

import type { ReactNode } from "react";

import { useMarketRuntime } from "@/hooks/useMarketRuntime";

export function MarketProvider({ children }: { children: ReactNode }) {
  useMarketRuntime();
  return <>{children}</>;
}
