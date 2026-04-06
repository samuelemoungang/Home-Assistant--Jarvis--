"use client"

import { useState, useEffect, useCallback } from "react"
import { ArrowLeft, RefreshCw, Link2, Check, X, ChevronDown, Building2, AlertCircle } from "lucide-react"
import type { Screen } from "@/lib/navigation"
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories"
import {
  getBankConnections,
  getPendingTransactions,
  confirmTransaction,
  rejectTransaction,
  type BankConnection,
  type PendingTransaction,
} from "@/lib/salt-edge"

interface BankSyncScreenProps {
  onNavigate: (screen: Screen) => void
}

export function BankSyncScreen({ onNavigate }: BankSyncScreenProps) {
  const [connections, setConnections] = useState<BankConnection[]>([])
  const [pending, setPending] = useState<PendingTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [conns, pend] = await Promise.all([
        getBankConnections(),
        getPendingTransactions("pending"),
      ])
      setConnections(conns)
      setPending(pend)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleConnect = async () => {
    try {
      setConnecting(true)
      setError(null)
      const returnUrl = `${window.location.origin}/api/bank/callback`
      const response = await fetch("/api/bank/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to connect")
      }

      const { connectUrl } = await response.json()
      window.location.href = connectUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed")
      setConnecting(false)
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      setError(null)
      const response = await fetch("/api/bank/sync", { method: "POST" })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Sync failed")
      }

      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  const handleConfirm = async (tx: PendingTransaction, category?: string) => {
    try {
      await confirmTransaction(
        tx.id,
        category || tx.category_suggestion || "Other",
        tx.transaction_type
      )
      setPending((prev) => prev.filter((p) => p.id !== tx.id))
      setEditingCategory(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to confirm")
    }
  }

  const handleReject = async (tx: PendingTransaction) => {
    try {
      await rejectTransaction(tx.id)
      setPending((prev) => prev.filter((p) => p.id !== tx.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject")
    }
  }

  const categories = (type: "income" | "expense") =>
    type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  return (
    <div className="relative w-full h-full overflow-y-auto p-4">
      <div className="mx-auto flex max-w-2xl flex-col gap-5 pt-4 pb-20">
        {/* Back button */}
        <div>
          <button
            type="button"
            onClick={() => onNavigate("finance")}
            className="inline-flex items-center gap-2 rounded-xl border border-glass-border bg-glass px-3 py-2 text-sm text-foreground backdrop-blur-xl hover:bg-glass/80 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 text-primary" />
            Back
          </button>
        </div>

        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Bank Sync</h1>
          <p className="text-sm text-muted-foreground">
            Connect your Raiffeisen account to automatically sync transactions
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Connection status */}
        <div className="rounded-xl border border-glass-border bg-glass p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {connections.length > 0 ? connections[0].provider_name : "Raiffeisen"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {connections.length > 0
                    ? `Last sync: ${connections[0].last_synced_at ? new Date(connections[0].last_synced_at).toLocaleString("de-CH") : "Never"}`
                    : "Not connected"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {connections.length > 0 ? (
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                  {syncing ? "Syncing..." : "Sync"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={connecting}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50 cursor-pointer"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  {connecting ? "Connecting..." : "Connect Bank"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Pending transactions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Pending Review ({pending.length})
            </h2>
            {pending.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Review uncategorized transactions
              </p>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pending.length === 0 ? (
            <div className="rounded-xl border border-glass-border bg-glass p-8 text-center backdrop-blur-xl">
              <Check className="mx-auto h-8 w-8 text-accent" />
              <p className="mt-2 text-sm font-medium text-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground">
                No transactions need review
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pending.map((tx) => (
                <div
                  key={tx.id}
                  className="rounded-xl border border-glass-border bg-glass p-3 backdrop-blur-xl"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {tx.merchant_name || tx.description || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.made_on).toLocaleDateString("de-CH")}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-mono font-medium ${
                        tx.transaction_type === "income" ? "text-accent" : "text-foreground"
                      }`}
                    >
                      {tx.transaction_type === "income" ? "+" : "-"}
                      {Math.abs(tx.amount).toLocaleString("en-CH")} {tx.currency}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    {/* Category selector */}
                    <div className="relative flex-1">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingCategory(editingCategory === tx.id ? null : tx.id)
                        }
                        className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-1.5 text-xs cursor-pointer"
                      >
                        <span>{tx.category_suggestion || "Select category"}</span>
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      {editingCategory === tx.id && (
                        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                          {categories(tx.transaction_type).map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => handleConfirm(tx, cat)}
                              className="w-full px-3 py-2 text-left text-xs hover:bg-muted cursor-pointer"
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleConfirm(tx)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-accent hover:bg-accent/30 cursor-pointer"
                        title="Confirm"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(tx)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 cursor-pointer"
                        title="Reject"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Confidence indicator */}
                  {tx.category_confidence > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1 flex-1 rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${tx.category_confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {Math.round(tx.category_confidence * 100)}% match
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <h3 className="text-sm font-medium text-foreground">How it works</h3>
          <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
            <li>1. Connect your Raiffeisen account via Salt Edge</li>
            <li>2. Transactions are automatically categorized when possible</li>
            <li>3. Review and confirm uncategorized transactions here</li>
            <li>4. Confirmed transactions appear in Income/Expenses</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
