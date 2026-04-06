"use client"

import { ArrowLeft, Target, Plus, X, Trash2, PiggyBank } from "lucide-react"
import { GlassCard } from "@/components/dashboard/glass-card"
import { useFinance } from "@/lib/finance-context"
import type { Screen } from "@/lib/navigation"
import { useState, useMemo } from "react"

interface SavingsScreenProps {
  onNavigate: (screen: Screen) => void
}

const SAVINGS_COLORS = ["#38bdf8", "#34d399", "#818cf8", "#fbbf24", "#f472b6"]

export function SavingsScreen({ onNavigate }: SavingsScreenProps) {
  const { savings, addSavingsGoal, addFundsToSavings, deleteSavingsGoal } = useFinance()
  const [showForm, setShowForm] = useState(false)
  const [showFundForm, setShowFundForm] = useState<string | null>(null)
  const [formName, setFormName] = useState("")
  const [formTarget, setFormTarget] = useState("")
  const [fundAmount, setFundAmount] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const totalSaved = useMemo(() => savings.reduce((a, b) => a + b.current_amount, 0), [savings])
  const totalTarget = useMemo(() => savings.reduce((a, b) => a + b.target_amount, 0), [savings])

  async function handleAddGoal() {
    if (!formName || !formTarget) return
    setSubmitting(true)
    try {
      await addSavingsGoal({
        name: formName,
        target_amount: parseFloat(formTarget),
      })
      setShowForm(false)
      setFormName("")
      setFormTarget("")
    } catch { /* */ }
    setSubmitting(false)
  }

  async function handleAddFunds() {
    if (!fundAmount || !showFundForm) return
    setSubmitting(true)
    try {
      await addFundsToSavings(showFundForm, parseFloat(fundAmount))
      setShowFundForm(null)
      setFundAmount("")
    } catch { /* */ }
    setSubmitting(false)
  }

  return (
    <div className="relative w-full h-full overflow-y-auto p-4">
      <GlassCard position="bottom-right" onClick={() => onNavigate("finance")} className="hidden md:flex">
        <ArrowLeft className="w-5 h-5 text-primary" />
        <span className="text-xs font-medium text-foreground">Back</span>
      </GlassCard>

      <GlassCard position="top-right" onClick={() => setShowForm(true)} className="hidden md:flex">
        <Plus className="w-5 h-5 text-primary" />
        <span className="text-xs font-medium text-foreground">Add</span>
      </GlassCard>

      <div className="mx-auto flex h-full max-w-lg flex-col gap-4 pb-4">
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

        <div className="flex flex-col items-center gap-4 md:h-full">
        <h2 className="text-lg font-semibold text-foreground">Savings Goals</h2>

        {/* Total summary */}
        <div className="flex items-center gap-3 rounded-lg border border-glass-border bg-glass backdrop-blur-xl px-4 py-2">
          <Target className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Total Saved</p>
            <p className="text-lg font-bold text-primary">
              {totalSaved.toLocaleString("en-CH")} / {totalTarget.toLocaleString("en-CH")} CHF
            </p>
          </div>
        </div>

        <div className="w-full space-y-3 md:flex-1 md:overflow-y-auto md:pr-2">
          {savings.length === 0 && (
            <p className="text-xs text-muted-foreground text-center mt-8">No savings goals yet. Tap Add to create one.</p>
          )}
          {savings.map((goal, idx) => {
            const percent = goal.target_amount > 0 ? Math.round((goal.current_amount / goal.target_amount) * 100) : 0
            const isComplete = percent >= 100
            const color = SAVINGS_COLORS[idx % SAVINGS_COLORS.length]

            return (
              <div key={goal.id} className="rounded-lg border border-glass-border bg-glass backdrop-blur-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">{goal.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {goal.current_amount.toLocaleString("en-CH")} / {goal.target_amount.toLocaleString("en-CH")} CHF
                    </span>
                    <button
                      type="button"
                      onClick={() => { setShowFundForm(goal.id); setFundAmount(""); }}
                      className="p-1 rounded text-primary hover:text-accent transition-colors cursor-pointer"
                      aria-label={`Add funds to ${goal.name}`}
                    >
                      <PiggyBank className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSavingsGoal(goal.id)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                      aria-label={`Delete goal ${goal.name}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(percent, 100)}%`, background: color }}
                  />
                </div>
                <div className="flex justify-end mt-1">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {percent}%{isComplete && " - Goal reached!"}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        </div>
      </div>

      {/* Add Goal Form */}
      {showForm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-[300px] rounded-xl border border-glass-border bg-card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">New Savings Goal</h3>
              <button type="button" onClick={() => setShowForm(false)} className="p-1 cursor-pointer" aria-label="Close form">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Goal name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="number"
              inputMode="decimal"
              placeholder="Target amount (CHF)"
              value={formTarget}
              onChange={(e) => setFormTarget(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={handleAddGoal}
              disabled={!formName || !formTarget || submitting}
              className="w-full rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-50 active:scale-[0.98] transition-transform cursor-pointer"
            >
              {submitting ? "Creating..." : "Create Goal"}
            </button>
          </div>
        </div>
      )}

      {/* Add Funds Form */}
      {showFundForm !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-[300px] rounded-xl border border-glass-border bg-card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Add Funds</h3>
              <button type="button" onClick={() => setShowFundForm(null)} className="p-1 cursor-pointer" aria-label="Close form">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <input
              type="number"
              inputMode="decimal"
              placeholder="Amount to add (CHF)"
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={handleAddFunds}
              disabled={!fundAmount || submitting}
              className="w-full rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-50 active:scale-[0.98] transition-transform cursor-pointer"
            >
              {submitting ? "Adding..." : "Add Funds"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
