import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "flams-analysis-imports";
const AnalysisContext = createContext(null);

const emptyByYear = {
  2025: null,
  2026: null,
};

export function AnalysisProvider({ children }) {
  const [importsByYear, setImportsByYear] = useState(() => {
    try {
      return { ...emptyByYear, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
    } catch {
      return emptyByYear;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(importsByYear));
  }, [importsByYear]);

  function saveImport(importResult) {
    setImportsByYear((current) => ({
      ...current,
      [importResult.year]: {
        ...importResult,
        importedAt: new Date().toISOString(),
      },
    }));
  }

  const value = useMemo(() => ({ importsByYear, saveImport }), [importsByYear]);

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysisStore() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error("useAnalysisStore must be used inside AnalysisProvider");
  }

  return context;
}

export function getActiveImport(importsByYear) {
  return importsByYear[2026] || importsByYear[2025] || null;
}

export function getKpis(importResult) {
  return importResult?.parsed?.kpis || {
    clientsCount: 0,
    lunchClients: 0,
    dinnerClients: 0,
    ticketsCount: 0,
    revenueConcerned: 0,
    discountAmount: 0,
    discountsQuantity: 0,
    averageTicket: 0,
    lunchTickets: 0,
    dinnerTickets: 0,
  };
}
