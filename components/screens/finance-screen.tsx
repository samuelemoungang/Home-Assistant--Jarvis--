"use client"

import { TrendingUp, PieChart, Landmark, FileText, ArrowLeft, X, LineChart } from "lucide-react"
import { useFinance } from "@/lib/finance-context"
import type { Screen } from "@/lib/navigation"
import { useState, useRef, useCallback, useMemo } from "react"

interface FinanceScreenProps {
  onNavigate: (screen: Screen) => void
}

type ExpandedCard = "income" | "budgets" | "savings" | "reports" | "investments" | null

export function FinanceScreen({ onNavigate }: FinanceScreenProps) {
  const { transactions, budgets, savings, currentMonth } = useFinance()
  const [expanded, setExpanded] = useState<ExpandedCard>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPress = useRef(false)

  const items = [
    { key: "income" as const, label: "Income / Expenses", icon: TrendingUp, target: "income" as Screen },
    { key: "budgets" as const, label: "Budgets", icon: PieChart, target: "budgets" as Screen },
    { key: "savings" as const, label: "Savings", icon: Landmark, target: "savings" as Screen },
    { key: "reports" as const, label: "Reports", icon: FileText, target: "reports" as Screen },
    { key: "investments" as const, label: "Investments", icon: LineChart, target: "investments" as Screen },
  ]

  // Long-press handlers
  const handleTouchStart = useCallback((key: ExpandedCard) => {
    didLongPress.current = false
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true
      setExpanded(key)
    }, 500)
  }, [])

  const handleTouchEnd = useCallback((target: Screen) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    if (!didLongPress.current) {
      onNavigate(target)
    }
  }, [onNavigate])

  const handleTouchCancel = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  // Compute summaries for expanded previews
  const income = useMemo(() => transactions.filter(t => t.type === "income"), [transactions])
  const expenses = useMemo(() => transactions.filter(t => t.type === "expense"), [transactions])
  const totalIncome = useMemo(() => income.reduce((s, t) => s + t.amount, 0), [income])
  const totalExpenses = useMemo(() => expenses.reduce((s, t) => s + t.amount, 0), [expenses])
  const overBudgets = useMemo(() => budgets.filter(b => b.spent > b.monthly_limit).length, [budgets])
  const totalSaved = useMemo(() => savings.reduce((s, g) => s + g.current_amount, 0), [savings])
  const totalTarget = useMemo(() => savings.reduce((s, g) => s + g.target_amount, 0), [savings])

  const summaries: Record<string, { title: string; lines: string[] }> = {
    income: {
      title: "Income / Expenses Summary",
      lines: [
        `Month: ${currentMonth}`,
        `Total Income: ${totalIncome.toLocaleString("en-CH")} CHF`,
        `Total Expenses: ${totalExpenses.toLocaleString("en-CH")} CHF`,
        `Net: ${(totalIncome - totalExpenses).toLocaleString("en-CH")} CHF`,
        `Transactions: ${transactions.length}`,
      ],
    },
    budgets: {
      title: "Budgets Overview",
      lines: [
        `Active Budgets: ${budgets.length}`,
        `Over Limit: ${overBudgets}`,
        ...budgets.slice(0, 4).map(b => `${b.category}: ${b.spent.toFixed(0)}/${b.monthly_limit} CHF`),
      ],
    },
    savings: {
      title: "Savings Progress",
      lines: [
        `Goals: ${savings.length}`,
        `Total Saved: ${totalSaved.toLocaleString("en-CH")} CHF`,
        `Total Target: ${totalTarget.toLocaleString("en-CH")} CHF`,
        `Progress: ${totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0}%`,
        ...savings.slice(0, 3).map(g => `${g.name}: ${Math.round((g.current_amount / g.target_amount) * 100)}%`),
      ],
    },
    reports: {
      title: "Reports",
      lines: [
        `Current Month: ${currentMonth}`,
        `Net This Month: ${(totalIncome - totalExpenses).toLocaleString("en-CH")} CHF`,
        `Export available in CSV, PDF, or Excel`,
        `Tap to open full Reports screen`,
      ],
    },
    investments: {
      title: "Investments",
      lines: [
        `Track stocks, ETFs, and indices`,
        `Choose your personal start date`,
        `Estimate return percentage automatically`,
        `Add invested capital to compute profit/loss`,
      ],
    },
  }

  return (
    <div className="relative w-full h-full">
      {/* Back button */}
      <button
        type="button"
        onClick={() => onNavigate("home")}
        className="absolute top-4 left-4 z-10 flex items-center gap-1.5 rounded-full border border-glass-border bg-glass backdrop-blur-xl px-3 py-1.5 active:scale-95 transition-transform cursor-pointer"
        aria-label="Back to home"
      >
        <ArrowLeft className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium text-foreground">Back</span>
      </button>

      {/* Status pill */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 rounded-full border border-glass-border bg-glass backdrop-blur-xl px-3 py-1.5">
        <div className="w-2 h-2 rounded-full bg-accent" />
        <span className="text-[10px] text-muted-foreground">Supabase</span>
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <h2 className="mb-2 text-lg font-semibold text-foreground">Finance</h2>
        <p className="mb-5 text-[10px] text-muted-foreground">Tap to open, hold to preview</p>
        <div className="grid w-full max-w-sm grid-cols-2 gap-4">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.key}
                type="button"
                onTouchStart={() => handleTouchStart(item.key)}
                onTouchEnd={() => handleTouchEnd(item.target)}
                onTouchCancel={handleTouchCancel}
                onMouseDown={() => handleTouchStart(item.key)}
                onMouseUp={() => handleTouchEnd(item.target)}
                onMouseLeave={handleTouchCancel}
                className={`flex flex-col items-center gap-2 rounded-xl border border-glass-border bg-glass p-5 backdrop-blur-xl transition-transform active:scale-95 cursor-pointer select-none ${
                  item.key === "investments" ? "col-span-2" : ""
                }`}
              >
                <Icon className="h-6 w-6 text-primary" />
                <span className="text-center text-xs font-medium text-foreground">{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Expanded overlook overlay */}
      {expanded && summaries[expanded] && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-background/70 backdrop-blur-sm"
          onClick={() => setExpanded(null)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Escape" && setExpanded(null)}
        >
          <div
            className="rounded-2xl border border-glass-border bg-card/95 backdrop-blur-xl p-6 w-[300px] flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={summaries[expanded].title}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">{summaries[expanded].title}</h3>
              <button
                type="button"
                onClick={() => setExpanded(null)}
                className="p-1 cursor-pointer"
                aria-label="Close preview"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-1.5">
              {summaries[expanded].lines.map((line, i) => (
                <p key={i} className="text-xs text-muted-foreground font-mono">{line}</p>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setExpanded(null)
                const item = items.find(i => i.key === expanded)
                if (item) onNavigate(item.target)
              }}
              className="mt-2 w-full rounded-lg bg-primary py-2.5 text-xs font-medium text-primary-foreground active:scale-[0.98] transition-transform cursor-pointer"
            >
              Open Full View
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
