import { createClient } from "@/lib/supabase/client"

// --- Types ---

export interface Transaction {
  id: string
  type: "income" | "expense"
  amount: number
  category: string
  description: string
  date: string
  created_at: string
}

export interface Budget {
  id: string
  category: string
  monthly_limit: number
  spent: number
  created_at: string
}

export interface SavingsGoal {
  id: string
  name: string
  target_amount: number
  current_amount: number
  created_at: string
}

export interface ReportSummary {
  month: string
  totalIncome: number
  totalExpenses: number
  net: number
  transactionCount: number
}

// --- Helper ---

function getSupabase() {
  return createClient()
}

// --- Transactions ---

export async function getTransactions(month?: string): Promise<Transaction[]> {
  const supabase = getSupabase()
  let query = supabase.from("transactions").select("*").order("date", { ascending: false })

  if (month) {
    const [year, m] = month.split("-").map(Number)
    const startDate = `${year}-${String(m).padStart(2, "0")}-01`
    const endDate = new Date(year, m, 0).toISOString().split("T")[0]
    query = query.gte("date", startDate).lte("date", endDate)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []).map((t) => ({ ...t, amount: Number(t.amount) }))
}

export async function addTransaction(data: {
  type: "income" | "expense"
  amount: number
  category: string
  description?: string
  date?: string
}): Promise<Transaction> {
  const supabase = getSupabase()
  const { data: row, error } = await supabase
    .from("transactions")
    .insert({
      type: data.type,
      amount: data.amount,
      category: data.category,
      description: data.description || "",
      date: data.date || new Date().toISOString().split("T")[0],
    })
    .select()
    .single()
  if (error) throw error
  return { ...row, amount: Number(row.amount) }
}

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from("transactions").delete().eq("id", id)
  if (error) throw error
}

// --- Budgets ---

export async function getBudgets(month?: string): Promise<Budget[]> {
  const supabase = getSupabase()
  const { data: budgets, error } = await supabase.from("budgets").select("*").order("category")
  if (error) throw error

  // Calculate spent from transactions for the given month
  const currentMonth = month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
  const [year, m] = currentMonth.split("-").map(Number)
  const startDate = `${year}-${String(m).padStart(2, "0")}-01`
  const endDate = new Date(year, m, 0).toISOString().split("T")[0]

  const { data: expenses } = await supabase
    .from("transactions")
    .select("category, amount")
    .eq("type", "expense")
    .gte("date", startDate)
    .lte("date", endDate)

  const spentByCategory: Record<string, number> = {}
  ;(expenses || []).forEach((e) => {
    spentByCategory[e.category] = (spentByCategory[e.category] || 0) + Number(e.amount)
  })

  return (budgets || []).map((b) => ({
    ...b,
    monthly_limit: Number(b.monthly_limit),
    spent: spentByCategory[b.category] || 0,
  }))
}

export async function addBudget(data: {
  category: string
  monthly_limit: number
}): Promise<Budget> {
  const supabase = getSupabase()
  const { data: row, error } = await supabase
    .from("budgets")
    .insert({
      category: data.category,
      monthly_limit: data.monthly_limit,
    })
    .select()
    .single()
  if (error) throw error
  return { ...row, monthly_limit: Number(row.monthly_limit), spent: 0 }
}

export async function deleteBudget(id: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from("budgets").delete().eq("id", id)
  if (error) throw error
}

// --- Savings ---

export async function getSavings(): Promise<SavingsGoal[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from("savings_goals").select("*").order("created_at")
  if (error) throw error
  return (data || []).map((g) => ({
    ...g,
    target_amount: Number(g.target_amount),
    current_amount: Number(g.current_amount),
  }))
}

export async function addSavingsGoal(data: {
  name: string
  target_amount: number
  current_amount?: number
}): Promise<SavingsGoal> {
  const supabase = getSupabase()
  const { data: row, error } = await supabase
    .from("savings_goals")
    .insert({
      name: data.name,
      target_amount: data.target_amount,
      current_amount: data.current_amount || 0,
    })
    .select()
    .single()
  if (error) throw error
  return {
    ...row,
    target_amount: Number(row.target_amount),
    current_amount: Number(row.current_amount),
  }
}

export async function addFundsToSavings(id: string, amount: number): Promise<SavingsGoal> {
  const supabase = getSupabase()
  // Get current amount first
  const { data: current, error: getErr } = await supabase
    .from("savings_goals")
    .select("current_amount")
    .eq("id", id)
    .single()
  if (getErr) throw getErr

  const newAmount = Number(current.current_amount) + amount
  const { data: row, error } = await supabase
    .from("savings_goals")
    .update({ current_amount: newAmount })
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return {
    ...row,
    target_amount: Number(row.target_amount),
    current_amount: Number(row.current_amount),
  }
}

export async function deleteSavingsGoal(id: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from("savings_goals").delete().eq("id", id)
  if (error) throw error
}

// --- Reports ---

export async function getReportSummary(month: string): Promise<ReportSummary> {
  const [year, m] = month.split("-").map(Number)
  const startDate = `${year}-${String(m).padStart(2, "0")}-01`
  const endDate = new Date(year, m, 0).toISOString().split("T")[0]

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)

  if (error) throw error

  const rows = data || []
  const totalIncome = rows.filter((r) => r.type === "income").reduce((s, r) => s + Number(r.amount), 0)
  const totalExpenses = rows.filter((r) => r.type === "expense").reduce((s, r) => s + Number(r.amount), 0)

  return {
    month,
    totalIncome,
    totalExpenses,
    net: totalIncome - totalExpenses,
    transactionCount: rows.length,
  }
}

export async function getReportTransactions(month: string): Promise<Transaction[]> {
  const [year, m] = month.split("-").map(Number)
  const startDate = `${year}-${String(m).padStart(2, "0")}-01`
  const endDate = new Date(year, m, 0).toISOString().split("T")[0]

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true })

  if (error) throw error
  return (data || []).map((t) => ({ ...t, amount: Number(t.amount) }))
}

// --- Smart Parser (rule-based, no external API needed) ---

export interface ParsedFinanceAction {
  action: "add_transaction" | "ask_category" | "chat"
  type?: "income" | "expense"
  amount?: number
  category?: string
  description?: string
}

const EXPENSE_KEYWORDS = ["spent", "paid", "bought", "cost", "expense", "payment", "bill"]
const INCOME_KEYWORDS = ["earned", "received", "income", "salary", "got paid", "freelance", "refund"]
const CATEGORY_MAP: Record<string, string> = {
  food: "Food", grocery: "Food", restaurant: "Food", lunch: "Food", dinner: "Food", coffee: "Food",
  transport: "Transport", uber: "Transport", bus: "Transport", train: "Transport", gas: "Transport", fuel: "Transport", taxi: "Transport",
  rent: "Housing", housing: "Housing", mortgage: "Housing",
  electric: "Utilities", water: "Utilities", internet: "Utilities", phone: "Utilities", utility: "Utilities",
  subscription: "Subscriptions", subscriptions: "Subscriptions", recurring: "Subscriptions", monthly: "Subscriptions", netflix: "Subscriptions", spotify: "Subscriptions",
  movie: "Entertainment", game: "Entertainment", entertainment: "Entertainment",
  doctor: "Health", pharmacy: "Health", medicine: "Health", health: "Health", gym: "Health",
  clothes: "Shopping", amazon: "Shopping", shopping: "Shopping", shoes: "Shopping",
  school: "Education", course: "Education", book: "Education", education: "Education",
  insurance: "Insurance",
  salary: "Salary", freelance: "Freelance", investment: "Investment",
}

export function parseFinanceMessage(message: string): ParsedFinanceAction {
  const lower = message.toLowerCase()

  // Extract amount (look for numbers, optionally followed by CHF)
  const amountMatch = lower.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:chf|francs?|fr)?/)
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(",", ".")) : undefined

  if (!amount) {
    return { action: "chat" }
  }

  // Determine type
  const isExpense = EXPENSE_KEYWORDS.some((kw) => lower.includes(kw))
  const isIncome = INCOME_KEYWORDS.some((kw) => lower.includes(kw))
  const type: "income" | "expense" = isIncome ? "income" : "expense"

  // Try to detect category
  let category: string | undefined
  for (const [keyword, cat] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(keyword)) {
      category = cat
      break
    }
  }

  // Extract description: the original message minus the amount
  const description = message.replace(/\d+(?:[.,]\d{1,2})?\s*(?:chf|francs?|fr)?/i, "").trim()

  if (!category) {
    return {
      action: "ask_category",
      type,
      amount,
      description,
    }
  }

  return {
    action: "add_transaction",
    type,
    amount,
    category,
    description,
  }
}
