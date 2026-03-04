"use client"

import { ArrowLeft, AlertTriangle, Plus, X, Trash2 } from "lucide-react"
import { GlassCard } from "@/components/dashboard/glass-card"
import { useFinance } from "@/lib/finance-context"
import { EXPENSE_CATEGORIES } from "@/lib/categories"
import type { Screen } from "@/lib/navigation"
import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"

interface BudgetsScreenProps {
  onNavigate: (screen: Screen) => void
}

const BUDGET_COLORS = ["#38bdf8", "#34d399", "#818cf8", "#fbbf24", "#f472b6", "#a78bfa"]

export function BudgetsScreen({ onNavigate }: BudgetsScreenProps) {
  const { budgets, addBudget, deleteBudget } = useFinance()
  const [showForm, setShowForm] = useState(false)
  const [formCategory, setFormCategory] = useState("")
  const [formLimit, setFormLimit] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Categories already budgeted (disabled in picker)
  const budgetedCategories = useMemo(
    () => new Set(budgets.map((b) => b.category)),
    [budgets]
  )

  // Available categories = EXPENSE_CATEGORIES that are not yet budgeted
  const availableCategories = useMemo(
    () => EXPENSE_CATEGORIES.filter((c) => !budgetedCategories.has(c)),
    [budgetedCategories]
  )

  async function handleSubmit() {
    if (!formCategory || !formLimit) return
    setSubmitting(true)
    try {
      await addBudget({
        category: formCategory,
        monthly_limit: parseFloat(formLimit),
      })
      setShowForm(false)
      setFormCategory("")
      setFormLimit("")
    } catch { /* */ }
    setSubmitting(false)
  }

  return (
    <div className="relative w-full h-full p-4">
      <GlassCard position="bottom-right" onClick={() => onNavigate("finance")}>
        <ArrowLeft className="w-5 h-5 text-primary" />
        <span className="text-xs font-medium text-foreground">Back</span>
      </GlassCard>

      <GlassCard position="top-right" onClick={() => setShowForm(true)}>
        <Plus className="w-5 h-5 text-primary" />
        <span className="text-xs font-medium text-foreground">Add</span>
      </GlassCard>

      <div className="flex flex-col items-center gap-4 h-full max-w-lg mx-auto">
        <h2 className="text-lg font-semibold text-foreground">Monthly Budgets</h2>
        <p className="text-xs text-muted-foreground">Track your spending against set limits</p>

        <div className="w-full flex-1 overflow-y-auto space-y-3 pr-2">
          {budgets.length === 0 && (
            <p className="text-xs text-muted-foreground text-center mt-8">No budgets set. Tap Add to create one.</p>
          )}
          {budgets.map((b, idx) => {
            const percent = b.monthly_limit > 0 ? Math.round((b.spent / b.monthly_limit) * 100) : 0
            const isOver = percent > 100
            const isWarning = percent >= 90
            const color = BUDGET_COLORS[idx % BUDGET_COLORS.length]

            return (
              <div key={b.id} className="rounded-lg border border-glass-border bg-glass backdrop-blur-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                    <span className="text-sm font-medium text-foreground">{b.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {(isOver || isWarning) && (
                      <AlertTriangle className={cn("w-3.5 h-3.5", isOver ? "text-destructive" : "text-chart-4")} />
                    )}
                    <span className="text-xs text-muted-foreground">{b.spent.toFixed(0)} / {b.monthly_limit} CHF</span>
                    <button
                      type="button"
                      onClick={() => deleteBudget(b.id)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                      aria-label={`Delete budget ${b.category}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isOver ? "bg-destructive" : isWarning ? "bg-chart-4" : ""
                    )}
                    style={{
                      width: `${Math.min(percent, 100)}%`,
                      background: !isOver && !isWarning ? color : undefined,
                    }}
                  />
                </div>
                <div className="flex justify-end mt-1">
                  <span className={cn("text-[10px] font-mono", isOver ? "text-destructive" : "text-muted-foreground")}>
                    {percent}%{isOver && " - Over budget!"}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add Budget Form */}
      {showForm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="rounded-xl border border-glass-border bg-card p-5 w-[340px] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Add Budget</h3>
              <button type="button" onClick={() => { setShowForm(false); setFormCategory(""); }} className="p-1 cursor-pointer" aria-label="Close form">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Category Chip Picker */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Select a category</p>
              {availableCategories.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">All categories have budgets already.</p>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto">
                  {EXPENSE_CATEGORIES.map((cat) => {
                    const isBudgeted = budgetedCategories.has(cat)
                    const isSelected = formCategory === cat
                    return (
                      <button
                        key={cat}
                        type="button"
                        disabled={isBudgeted}
                        onClick={() => setFormCategory(isSelected ? "" : cat)}
                        className={cn(
                          "rounded-full px-3.5 py-2 text-xs font-medium transition-all cursor-pointer",
                          "border active:scale-95",
                          isBudgeted
                            ? "border-border bg-secondary/50 text-muted-foreground/40 cursor-not-allowed line-through"
                            : isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-secondary text-secondary-foreground hover:border-primary/50"
                        )}
                        aria-label={isBudgeted ? `${cat} already has a budget` : `Select ${cat}`}
                      >
                        {cat}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Monthly Limit */}
            <input
              type="number"
              inputMode="decimal"
              placeholder="Monthly limit (CHF)"
              value={formLimit}
              onChange={(e) => setFormLimit(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
            />

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!formCategory || !formLimit || submitting}
              className="w-full rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-50 active:scale-[0.98] transition-transform cursor-pointer"
            >
              {submitting ? "Adding..." : `Add Budget for ${formCategory || "..."}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
