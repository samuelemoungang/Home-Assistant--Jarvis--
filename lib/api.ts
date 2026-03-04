const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://apihm.taild19dd0.ts.net/";

// --- Types ---

export interface Transaction {
  id: number;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  date: string;
  created_at: string;
}

export interface Budget {
  id: number;
  category: string;
  monthly_limit: number;
  color: string;
  spent: number;
  month: string;
}

export interface SavingsGoal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  color: string;
}

export interface ReportSummary {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  net: number;
  transactionCount: number;
}

export interface AssistantResponse {
  action: "add_transaction" | "ask_category" | "add_savings" | "chat";
  type?: "income" | "expense";
  amount?: number;
  category?: string;
  categories?: string[];
  description?: string;
  date?: string;
  message?: string;
  saved?: boolean;
  transaction_id?: number;
  goal_name?: string;
  goal_id?: number;
}

// --- Helper ---

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// --- Transactions ---

export async function getTransactions(month?: string, type?: string): Promise<Transaction[]> {
  const params = new URLSearchParams();
  if (month) params.set("month", month);
  if (type) params.set("type", type);
  const qs = params.toString();
  return apiFetch(`/api/transactions${qs ? `?${qs}` : ""}`);
}

export async function addTransaction(data: {
  type: "income" | "expense";
  amount: number;
  category: string;
  description?: string;
  date?: string;
}): Promise<Transaction> {
  return apiFetch("/api/transactions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteTransaction(id: number): Promise<void> {
  await apiFetch(`/api/transactions/${id}`, { method: "DELETE" });
}

// --- Budgets ---

export async function getBudgets(month?: string): Promise<Budget[]> {
  const qs = month ? `?month=${month}` : "";
  return apiFetch(`/api/budgets${qs}`);
}

export async function addBudget(data: {
  category: string;
  monthly_limit: number;
  color?: string;
}): Promise<Budget> {
  return apiFetch("/api/budgets", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteBudget(id: number): Promise<void> {
  await apiFetch(`/api/budgets/${id}`, { method: "DELETE" });
}

// --- Savings ---

export async function getSavings(): Promise<SavingsGoal[]> {
  return apiFetch("/api/savings");
}

export async function addSavingsGoal(data: {
  name: string;
  target_amount: number;
  current_amount?: number;
  color?: string;
}): Promise<SavingsGoal> {
  return apiFetch("/api/savings", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function addFundsToSavings(id: number, amount: number): Promise<SavingsGoal> {
  return apiFetch(`/api/savings/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ amount }),
  });
}

export async function deleteSavingsGoal(id: number): Promise<void> {
  await apiFetch(`/api/savings/${id}`, { method: "DELETE" });
}

// --- Reports ---

export function getReportUrl(month: string, format: "csv" | "pdf" | "excel"): string {
  return `${API_URL}/api/reports/${month}/${format}`;
}

export async function getReportSummary(month: string): Promise<ReportSummary> {
  return apiFetch(`/api/reports/${month}/summary`);
}

// --- Assistant ---

export async function parseAssistantMessage(message: string): Promise<AssistantResponse> {
  return apiFetch("/api/assistant/parse", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

// --- Health ---

export async function checkHealth(): Promise<boolean> {
  try {
    await apiFetch("/api/health");
    return true;
  } catch {
    return false;
  }
}
