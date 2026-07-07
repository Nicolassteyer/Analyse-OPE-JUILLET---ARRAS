import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { fetchImportStore, resetImportStore } from "../services/api.js";

const AnalysisContext = createContext(null);

const emptyByYear = {
  2025: null,
  2026: null,
};

const emptyStore = {
  importsByYear: emptyByYear,
  history: [],
};

export function AnalysisProvider({ children }) {
  const [store, setStore] = useState(emptyStore);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function refreshImports() {
    setLoading(true);
    setError(null);
    try {
      const nextStore = await fetchImportStore();
      setStore({
        importsByYear: { ...emptyByYear, ...(nextStore.importsByYear || {}) },
        history: nextStore.history || [],
      });
    } catch (refreshError) {
      setError(refreshError.message);
    } finally {
      setLoading(false);
    }
  }

  async function resetImports() {
    const nextStore = await resetImportStore();
    setStore({
      importsByYear: { ...emptyByYear, ...(nextStore.importsByYear || {}) },
      history: nextStore.history || [],
    });
  }

  function saveImport(importResult) {
    const nextStore = importResult.store || {
      importsByYear: {
        ...store.importsByYear,
        [importResult.year]: importResult,
      },
      history: [importResult, ...store.history],
    };

    setStore({
      importsByYear: { ...emptyByYear, ...(nextStore.importsByYear || {}) },
      history: nextStore.history || [],
    });
  }

  useEffect(() => {
    refreshImports();
  }, []);

  const value = useMemo(
    () => ({
      importsByYear: store.importsByYear,
      history: store.history,
      loading,
      error,
      refreshImports,
      resetImports,
      saveImport,
    }),
    [store, loading, error],
  );

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
  return normalizeKpis(importResult?.parsed?.kpis);
}

export function getGlobalKpis(importResult) {
  return normalizeKpis(importResult?.parsed?.allTicketsKpis || importResult?.parsed?.kpis);
}

function normalizeKpis(kpis) {
  return kpis || {
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
