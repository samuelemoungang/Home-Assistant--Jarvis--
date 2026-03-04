"use client"

import { TrendingUp, PieChart, Landmark, FileText, ArrowLeft } from "lucide-react"
import { GlassCard } from "@/components/dashboard/glass-card"
import { AvatarDisplay } from "@/components/dashboard/avatar-display"
import { useFinance } from "@/lib/finance-context"
import type { Screen } from "@/lib/navigation"

interface FinanceScreenProps {
  onNavigate: (screen: Screen) => void
}

export function FinanceScreen({ onNavigate }: FinanceScreenProps) {
  const { isConnected } = useFinance()

  const items = [
    { label: "Income / Expenses", icon: TrendingUp, target: "income" as Screen },
    { label: "Budgets", icon: PieChart, target: "budgets" as Screen },
    { label: "Savings", icon: Landmark, target: "savings" as Screen },
    { label: "Reports", icon: FileText, target: "reports" as Screen },
  ]

  return (
    <div className="relative w-full h-full">
      {/* Back button floating top-left as a small pill */}
      <button
        type="button"
        onClick={() => onNavigate("home")}
        className="absolute top-4 left-4 z-10 flex items-center gap-1.5 rounded-full border border-glass-border bg-glass backdrop-blur-xl px-3 py-1.5 active:scale-95 transition-transform cursor-pointer"
        aria-label="Back to home"
      >
        <ArrowLeft className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium text-foreground">Back</span>
      </button>

      {/* Connection status pill */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 rounded-full border border-glass-border bg-glass backdrop-blur-xl px-3 py-1.5">
        <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-accent" : "bg-destructive"}`} />
        <span className="text-[10px] text-muted-foreground">
          {isConnected ? "Connected" : "Offline"}
        </span>
      </div>

      {/* Center grid of finance options */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <h2 className="text-lg font-semibold text-foreground mb-6">Finance</h2>
        <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onNavigate(item.target)}
                className="flex flex-col items-center gap-2 rounded-xl border border-glass-border bg-glass backdrop-blur-xl p-5 active:scale-95 transition-transform cursor-pointer"
              >
                <Icon className="w-6 h-6 text-primary" />
                <span className="text-xs font-medium text-foreground text-center">{item.label}</span>
              </button>
            )
          })}
        </div>
        <p className="mt-6 text-xs text-muted-foreground max-w-xs text-center text-balance">
          Manage your income, expenses, budgets, savings, and monthly reports.
        </p>
      </div>
    </div>
  )
}
