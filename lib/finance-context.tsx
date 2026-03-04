"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { Transaction, Budget, SavingsGoal } from "./api";
import * as api from "./api";

interface FinanceContextType {
  // Data
  transactions: Transaction[];
  budgets: Budget[];
  savings: SavingsGoal[];
  currentMonth: string;
  isConnected: boolean;
  isLoading: boolean;

  // Actions
  setCurrentMonth: (month: string) => void;
  refreshAll: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshBudgets: () => Promise<void>;
  refreshSavings: () => Promise<void>;

  // CRUD
  addTransaction: (data: Parameters<typeof api.addTransaction>[0]) => Promise<Transaction>;
  deleteTransaction: (id: number) => Promise<void>;
  addBudget: (data: Parameters<typeof api.addBudget>[0]) => Promise<Budget>;
  deleteBudget: (id: number) => Promise<void>;
  addSavingsGoal: (data: Parameters<typeof api.addSavingsGoal>[0]) => Promise<SavingsGoal>;
  addFundsToSavings: (id: number, amount: number) => Promise<SavingsGoal>;
  deleteSavingsGoal: (id: number) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | null>(null);

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used within FinanceProvider");
  return ctx;
}

function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [savings, setSavings] = useState<SavingsGoal[]>([]);
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshTransactions = useCallback(async () => {
    try {
      const data = await api.getTransactions(currentMonth);
      setTransactions(data);
    } catch {
      /* backend offline */
    }
  }, [currentMonth]);

  const refreshBudgets = useCallback(async () => {
    try {
      const data = await api.getBudgets(currentMonth);
      setBudgets(data);
    } catch {
      /* backend offline */
    }
  }, [currentMonth]);

  const refreshSavings = useCallback(async () => {
    try {
      const data = await api.getSavings();
      setSavings(data);
    } catch {
      /* backend offline */
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([refreshTransactions(), refreshBudgets(), refreshSavings()]);
    setIsLoading(false);
  }, [refreshTransactions, refreshBudgets, refreshSavings]);

  // Check backend health on mount
  useEffect(() => {
    api.checkHealth().then((ok) => {
      setIsConnected(ok);
      if (ok) refreshAll();
      else setIsLoading(false);
    });
  }, [refreshAll]);

  // Refresh when month changes
  useEffect(() => {
    if (isConnected) {
      refreshTransactions();
      refreshBudgets();
    }
  }, [currentMonth, isConnected, refreshTransactions, refreshBudgets]);

  const handleAddTransaction = useCallback(async (data: Parameters<typeof api.addTransaction>[0]) => {
    const tx = await api.addTransaction(data);
    await refreshTransactions();
    await refreshBudgets();
    return tx;
  }, [refreshTransactions, refreshBudgets]);

  const handleDeleteTransaction = useCallback(async (id: number) => {
    await api.deleteTransaction(id);
    await refreshTransactions();
    await refreshBudgets();
  }, [refreshTransactions, refreshBudgets]);

  const handleAddBudget = useCallback(async (data: Parameters<typeof api.addBudget>[0]) => {
    const b = await api.addBudget(data);
    await refreshBudgets();
    return b;
  }, [refreshBudgets]);

  const handleDeleteBudget = useCallback(async (id: number) => {
    await api.deleteBudget(id);
    await refreshBudgets();
  }, [refreshBudgets]);

  const handleAddSavingsGoal = useCallback(async (data: Parameters<typeof api.addSavingsGoal>[0]) => {
    const g = await api.addSavingsGoal(data);
    await refreshSavings();
    return g;
  }, [refreshSavings]);

  const handleAddFunds = useCallback(async (id: number, amount: number) => {
    const g = await api.addFundsToSavings(id, amount);
    await refreshSavings();
    return g;
  }, [refreshSavings]);

  const handleDeleteSavingsGoal = useCallback(async (id: number) => {
    await api.deleteSavingsGoal(id);
    await refreshSavings();
  }, [refreshSavings]);

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        budgets,
        savings,
        currentMonth,
        isConnected,
        isLoading,
        setCurrentMonth,
        refreshAll,
        refreshTransactions,
        refreshBudgets,
        refreshSavings,
        addTransaction: handleAddTransaction,
        deleteTransaction: handleDeleteTransaction,
        addBudget: handleAddBudget,
        deleteBudget: handleDeleteBudget,
        addSavingsGoal: handleAddSavingsGoal,
        addFundsToSavings: handleAddFunds,
        deleteSavingsGoal: handleDeleteSavingsGoal,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}
