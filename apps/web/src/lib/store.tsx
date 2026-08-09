"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { GuardianScan } from "@guardian/shared";
import { demoScans } from "./demo-data";

type StoreValue = {
  hydrated: boolean;
  scans: GuardianScan[];
  watchlist: string[];
  saveScan: (scan: GuardianScan) => void;
  updateScan: (id: string, patch: Partial<GuardianScan>) => void;
  getScan: (id: string) => GuardianScan | undefined;
  toggleWatchlist: (scanId: string) => void;
};

const StoreContext = createContext<StoreValue | null>(null);
const scansKey = "guardian-lens-scans-v1";
const watchlistKey = "guardian-lens-watchlist-v1";

export function GuardianStoreProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [scans, setScans] = useState<GuardianScan[]>(demoScans);
  const [watchlist, setWatchlist] = useState<string[]>(["demo-caution"]);

  useEffect(() => {
    try {
      const savedScans = localStorage.getItem(scansKey);
      const savedWatchlist = localStorage.getItem(watchlistKey);
      if (savedScans) setScans(JSON.parse(savedScans) as GuardianScan[]);
      if (savedWatchlist) setWatchlist(JSON.parse(savedWatchlist) as string[]);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(scansKey, JSON.stringify(scans));
  }, [hydrated, scans]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(watchlistKey, JSON.stringify(watchlist));
  }, [hydrated, watchlist]);

  const saveScan = useCallback((scan: GuardianScan) => {
    setScans((current) => [scan, ...current.filter((item) => item.id !== scan.id)]);
  }, []);

  const updateScan = useCallback((id: string, patch: Partial<GuardianScan>) => {
    setScans((current) => current.map((scan) => scan.id === id ? { ...scan, ...patch, updatedAt: new Date().toISOString() } : scan));
  }, []);

  const getScan = useCallback((id: string) => scans.find((scan) => scan.id === id), [scans]);

  const toggleWatchlist = useCallback((scanId: string) => {
    setWatchlist((current) => current.includes(scanId) ? current.filter((id) => id !== scanId) : [scanId, ...current]);
  }, []);

  const value = useMemo(() => ({ hydrated, scans, watchlist, saveScan, updateScan, getScan, toggleWatchlist }), [hydrated, scans, watchlist, saveScan, updateScan, getScan, toggleWatchlist]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useGuardianStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useGuardianStore must be used inside GuardianStoreProvider");
  return value;
}
