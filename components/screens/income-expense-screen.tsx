"use client"

import { ArrowLeft, Plus, Trash2, X } from "lucide-react"
import { GlassCard } from "@/components/dashboard/glass-card"
import { useFinance } from "@/lib/finance-context"
import type { Screen } from "@/lib/navigation"
import { useState, useMemo } from "react"
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
} from "recharts"
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories"

interface IncomeExpenseScreenProps {
  onNavigate: (screen: Screen) => void
}

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]

export function IncomeExpenseScreen({ onNavigate }: IncomeExpenseScreenProps) {
  const { transactions, currentMonth, addTransaction, deleteTransaction } = useFinance()
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState<"income" | "expense">("expense")
  const [formAmount, setFormAmount] = useState("")
  const [formCategory, setFormCategory] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0])
  const [submitting, setSubmitting] = useState(false)

  const income = useMemo(() => transactions.filter(t => t.type === "income"), [transactions])
  const expenses = useMemo(() => transactions.filter(t => t.type === "expense"), [transactions])
  const totalIncome = useMemo(() => income.reduce((s, t) => s + t.amount, 0), [income])
  const totalExpenses = useMemo(() => expenses.reduce((s, t) => s + t.amount, 0), [expenses])

  // Pie chart data: group expenses by category
  const pieData = useMemo(() => {
    const groups: Record<string, number> = {}
    expenses.forEach(t => {
      groups[t.category] = (groups[t.category] || 0) + t.amount
    })
    return Object.entries(groups).map(([name, value], i) => ({
      name,
      value,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }))
  }, [expenses])

  // Bar chart: income vs expense per month (last 6 months)
  const barData = useMemo(() => {
    const [year, month] = currentMonth.split("-").map(Number)
    const months: { month: string; income: number; expenses: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const label = d.toLocaleString("en", { month: "short" })
      const inc = transactions.filter(t => t.type === "income" && t.date.startsWith(key)).reduce((s, t) => s + t.amount, 0)
      const exp = transactions.filter(t => t.type === "expense" && t.date.startsWith(key)).reduce((s, t) => s + t.amount, 0)
      months.push({ month: label, income: inc, expenses: exp })
    }
    return months
  }, [transactions, currentMonth])

  async function handleSubmit() {
    if (!formAmount || !formCategory) return
    setSubmitting(true)
    try {
      await addTransaction({
        type: formType,
        amount: parseFloat(formAmount),
        category: formCategory,
        description: formDescription,
        date: formDate,
      })
      setShowForm(false)
      setFormAmount("")
      setFormCategory("")
      setFormDescription("")
    } catch (err) {
      // silently fail
    }
    setSubmitting(false)
  }

  const categories = formType === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

  return (
    <div className="relative w-full h-full overflow-y-auto p-4">
      {/* Back button */}
      <GlassCard position="bottom-right" onClick={() => onNavigate("finance")} className="hidden md:flex">
        <ArrowLeft className="w-5 h-5 text-primary" />
        <span className="text-xs font-medium text-foreground">Back</span>
      </GlassCard>

      {/* Add button */}
      <GlassCard position="top-right" onClick={() => setShowForm(true)} className="hidden md:flex">
        <Plus className="w-5 h-5 text-primary" />
        <span className="text-xs font-medium text-foreground">Add</span>
      </GlassCard>

      <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-3 pb-4 md:items-center">
        <div className="flex items-center justify-between gap-3 md:hidden">
          <button
            type="button"
            onClick={() => onNavigate("finance")}
            className="inline-flex items-center gap-2 rounded-xl border border-glass-border bg-glass px-3 py-2 text-sm text-foreground backdrop-blur-xl"
          >
            <ArrowLeft className="h-4 w-4 text-primary" />
            Back
          </button>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-glass-border bg-glass px-3 py-2 text-sm text-foreground backdrop-blur-xl"
          >
            <Plus className="h-4 w-4 text-primary" />
            Add
          </button>
        </div>

        <h2 className="text-lg font-semibold text-foreground">Income & Expenses</h2>

        {/* Summary */}
        <div className="grid w-full grid-cols-3 gap-3 md:flex md:w-auto md:gap-6">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Income</p>
            <p className="text-lg font-bold text-accent">{totalIncome.toLocaleString("en-CH")} CHF</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Expenses</p>
            <p className="text-lg font-bold text-destructive">{totalExpenses.toLocaleString("en-CH")} CHF</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Net</p>
            <p className="text-lg font-bold text-primary">{(totalIncome - totalExpenses).toLocaleString("en-CH")} CHF</p>
          </div>
        </div>

        {/* Charts + List */}
        <div className="flex w-full flex-1 flex-col gap-4 overflow-visible md:flex-row md:overflow-hidden">
          {/* Charts column */}
          <div className="flex w-full flex-col gap-2 md:w-1/2">
            {pieData.length > 0 ? (
              <>
                <p className="text-xs text-muted-foreground text-center">Expenses by Category</p>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3} dataKey="value">
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        color: "var(--foreground)",
                        fontSize: "11px",
                      }}
                      itemStyle={{ color: "var(--foreground)" }}
                      labelStyle={{ color: "var(--foreground)" }}
                      formatter={(value: number) => [`${value} CHF`]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 justify-center">
                  {pieData.map((e) => (
                    <div key={e.name} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ background: e.fill }} />
                      <span className="text-[10px] text-muted-foreground">{e.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center flex-1">
                <p className="text-xs text-muted-foreground">No expenses this month</p>
              </div>
            )}
          </div>

          {/* Transaction list */}
          <div className="flex w-full min-h-0 flex-col md:w-1/2">
            <p className="text-xs text-muted-foreground text-center mb-2">Recent Transactions</p>
            <div className="space-y-1.5 md:flex-1 md:overflow-y-auto md:pr-1">
              {transactions.length === 0 && (
                <p className="text-xs text-muted-foreground text-center mt-8">No transactions yet. Tap Add to start.</p>
              )}
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center gap-2 rounded-lg border border-glass-border bg-glass backdrop-blur-xl px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${t.type === "income" ? "text-accent" : "text-destructive"}`}>
                        {t.type === "income" ? "+" : "-"}{t.amount} CHF
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate">{t.category}</span>
                    </div>
                    {t.description && <p className="text-[10px] text-muted-foreground truncate">{t.description}</p>}
                  </div>
                  <span className="text-[9px] text-muted-foreground font-mono whitespace-nowrap">{t.date}</span>
                  <button
                    type="button"
                    onClick={() => deleteTransaction(t.id)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                    aria-label={`Delete transaction ${t.description || t.category}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Transaction Form Overlay */}
      {showForm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="rounded-xl border border-glass-border bg-card p-5 w-[320px] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Add Transaction</h3>
              <button type="button" onClick={() => setShowForm(false)} className="p-1 cursor-pointer" aria-label="Close form">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Type toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => { setFormType("expense"); setFormCategory(""); }}
                className={`flex-1 py-2 text-xs font-medium transition-colors cursor-pointer ${formType === "expense" ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground"}`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => { setFormType("income"); setFormCategory(""); }}
                className={`flex-1 py-2 text-xs font-medium transition-colors cursor-pointer ${formType === "income" ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"}`}
              >
                Income
              </button>
            </div>

            {/* Amount */}
            <input
              type="number"
              inputMode="decimal"
              placeholder="Amount (CHF)"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
            />

            {/* Category */}
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            >
              <option value="" disabled>Select category</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Description */}
            <input
              type="text"
              placeholder="Description (optional)"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
            />

            {/* Date */}
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            />

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!formAmount || !formCategory || submitting}
              className="w-full rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-50 active:scale-[0.98] transition-transform cursor-pointer"
            >
              {submitting ? "Adding..." : "Add Transaction"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
