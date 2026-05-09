import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { appendFeedingEntry } from "@/state/feedingRecords";

const FeedingRecordsContext = createContext(undefined);

export function FeedingRecordsProvider({ children }) {
  const [entries, setEntries] = useState([]);

  const addFeedingRecord = useCallback((entry) => {
    setEntries((prev) => appendFeedingEntry(prev, entry));
  }, []);

  const value = useMemo(() => ({ entries, addFeedingRecord }), [entries, addFeedingRecord]);

  return <FeedingRecordsContext.Provider value={value}>{children}</FeedingRecordsContext.Provider>;
}

export function useFeedingRecords() {
  const ctx = useContext(FeedingRecordsContext);
  if (ctx === undefined) {
    throw new Error("useFeedingRecords must be used within FeedingRecordsProvider.");
  }
  return ctx;
}
