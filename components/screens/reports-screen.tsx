"use client"

import { ArrowLeft, ChevronLeft, ChevronRight, FileText, FileSpreadsheet, Download } from "lucide-react"
import { GlassCard } from "@/components/dashboard/glass-card"
import type { Screen } from "@/lib/navigation"
import { useState, useEffect } from "react"
import { getReportSummary, getReportUrl, type ReportSummary } from "@/lib/api"

interface ReportsScreenProps {
  onNavigate: (screen: Screen) => void
}

function getMonthLabel(month: string) {
  const [year, m] = month.split("-").map(Number)
  const d = new Date(year, m - 1, 1)
  return d.toLocaleString("en-US", { month: "long", year: "numeric" })
}

function shiftMonth(month: string, delta: number) {
  const [year, m] = month.split("-").map(Number)
  const d = new Date(year, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function ReportsScreen({ onNavigate }: ReportsScreenProps) {
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const [month, setMonth] = useState(currentMonth)
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getReportSummary(month)
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false))
  }, [month])

  function handleExport(format: "csv" | "pdf" | "excel") {
    const url = getReportUrl(month, format)
    window.open(url, "_blank")
  }

  return (
    <div className="relative w-full h-full p-4">
      <GlassCard position="bottom-right" onClick={() => onNavigate("finance")}>
        <ArrowLeft className="w-5 h-5 text-primary" />
        <span className="text-xs font-medium text-foreground">Back</span>
      </GlassCard>

      <div className="flex flex-col items-center gap-5 h-full max-w-md mx-auto">
        <h2 className="text-lg font-semibold text-foreground">Monthly Reports</h2>

        {/* Month picker */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, -1))}
            className="p-2 rounded-lg border border-border bg-secondary text-foreground active:scale-95 transition-transform cursor-pointer"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-foreground min-w-[160px] text-center">
            {getMonthLabel(month)}
          </span>
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, 1))}
            className="p-2 rounded-lg border border-border bg-secondary text-foreground active:scale-95 transition-transform cursor-pointer"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Summary */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : summary ? (
          <>
            <div className="w-full grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-glass-border bg-glass backdrop-blur-xl p-3 text-center">
                <p className="text-[10px] text-muted-foreground">Income</p>
                <p className="text-lg font-bold text-accent">{summary.totalIncome.toLocaleString("en-CH")} CHF</p>
              </div>
              <div className="rounded-lg border border-glass-border bg-glass backdrop-blur-xl p-3 text-center">
                <p className="text-[10px] text-muted-foreground">Expenses</p>
                <p className="text-lg font-bold text-destructive">{summary.totalExpenses.toLocaleString("en-CH")} CHF</p>
              </div>
              <div className="rounded-lg border border-glass-border bg-glass backdrop-blur-xl p-3 text-center">
                <p className="text-[10px] text-muted-foreground">Net</p>
                <p className={`text-lg font-bold ${summary.net >= 0 ? "text-primary" : "text-destructive"}`}>
                  {summary.net.toLocaleString("en-CH")} CHF
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {summary.transactionCount} transactions in {getMonthLabel(month)}
            </p>

            {/* Export buttons */}
            <div className="w-full flex flex-col gap-3">
              <p className="text-xs text-muted-foreground text-center">Export Report</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleExport("csv")}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary py-3 text-sm font-medium text-secondary-foreground active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  CSV
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("pdf")}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary py-3 text-sm font-medium text-secondary-foreground active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("excel")}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary py-3 text-sm font-medium text-secondary-foreground active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-foreground font-medium">Backend Offline</p>
              <p className="text-sm text-muted-foreground mt-1">Connect to your Proxmox server to generate reports.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
