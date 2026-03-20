"use client"

import { ArrowLeft, ChevronLeft, ChevronRight, FileText, FileSpreadsheet, Download, Eye } from "lucide-react"
import { GlassCard } from "@/components/dashboard/glass-card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Screen } from "@/lib/navigation"
import { useState, useEffect } from "react"
import { getReportSummary, getReportTransactions, type ReportSummary, type Transaction } from "@/lib/api"

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

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function generateCSV(transactions: Transaction[], month: string): void {
  const header = "Date,Type,Category,Amount (CHF),Description"
  const rows = transactions.map(
    (t) => `${t.date},${t.type},${t.category},${t.amount},"${t.description || ""}"`
  )
  downloadBlob([header, ...rows].join("\n"), `report-${month}.csv`, "text/csv")
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function buildPDFContent(
  transactions: Transaction[],
  summary: ReportSummary,
  month: string,
  options?: { autoPrint?: boolean },
): string {
  const autoPrint = options?.autoPrint ?? false

  return `<!DOCTYPE html>
<html><head><title>Finance Report - ${getMonthLabel(month)}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #1a1a2e; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  h2 { font-size: 16px; color: #666; margin-top: 0; }
  .summary { display: flex; gap: 24px; margin: 24px 0; }
  .summary-item { padding: 12px 20px; border-radius: 8px; background: #f4f4f8; }
  .summary-item .label { font-size: 11px; color: #888; text-transform: uppercase; }
  .summary-item .value { font-size: 20px; font-weight: bold; }
  .income { color: #10b981; }
  .expense { color: #ef4444; }
  .net { color: #3b82f6; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
  th { background: #f9f9fb; font-weight: 600; }
  @media print { body { padding: 20px; } }
</style></head><body>
<h1>Finance Report</h1>
<h2>${getMonthLabel(month)}</h2>
<div class="summary">
  <div class="summary-item"><div class="label">Income</div><div class="value income">${summary.totalIncome.toLocaleString("en-CH")} CHF</div></div>
  <div class="summary-item"><div class="label">Expenses</div><div class="value expense">${summary.totalExpenses.toLocaleString("en-CH")} CHF</div></div>
  <div class="summary-item"><div class="label">Net</div><div class="value net">${summary.net.toLocaleString("en-CH")} CHF</div></div>
</div>
<p>${summary.transactionCount} transactions</p>
<table><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Amount</th><th>Description</th></tr></thead><tbody>
${transactions
  .map(
    (t) =>
      `<tr><td>${escapeHtml(t.date)}</td><td>${escapeHtml(t.type)}</td><td>${escapeHtml(t.category)}</td><td>${t.type === "income" ? "+" : "-"}${t.amount} CHF</td><td>${escapeHtml(t.description || "-")}</td></tr>`,
  )
  .join("")}
</tbody></table>
${autoPrint ? "<script>window.print();</script>" : ""}
</body></html>`
}

function downloadPDFReport(transactions: Transaction[], summary: ReportSummary, month: string): void {
  const html = buildPDFContent(transactions, summary, month, { autoPrint: true })
  const win = window.open("", "_blank")
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}

function generateExcel(transactions: Transaction[], month: string): void {
  // Generate TSV (opens in Excel)
  const header = "Date\tType\tCategory\tAmount (CHF)\tDescription"
  const rows = transactions.map(
    (t) => `${t.date}\t${t.type}\t${t.category}\t${t.amount}\t${t.description || ""}`
  )
  downloadBlob([header, ...rows].join("\n"), `report-${month}.xls`, "application/vnd.ms-excel")
}

export function ReportsScreen({ onNavigate }: ReportsScreenProps) {
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const [month, setMonth] = useState(currentMonth)
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewHtml, setPreviewHtml] = useState("")
  const [previewTransactions, setPreviewTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    setLoading(true)
    getReportSummary(month)
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false))
  }, [month])

  async function handleExport(format: "csv" | "pdf" | "excel") {
    if (!summary) return
    setExporting(true)
    try {
      const transactions = await getReportTransactions(month)
      if (format === "csv") generateCSV(transactions, month)
      else if (format === "pdf") {
        setPreviewTransactions(transactions)
        setPreviewHtml(buildPDFContent(transactions, summary, month))
        setPreviewOpen(true)
      }
      else generateExcel(transactions, month)
    } catch (e) {
      console.error("Export failed:", e)
    }
    setExporting(false)
  }

  return (
    <div className="relative w-full h-full p-4">
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle>PDF Preview</DialogTitle>
            <DialogDescription>
              Controlla il report di {getMonthLabel(month)} prima di scaricarlo come PDF.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 px-6">
            <iframe
              title={`PDF preview for ${getMonthLabel(month)}`}
              srcDoc={previewHtml}
              className="w-full h-[62vh] rounded-xl border border-border bg-white"
            />
          </div>

          <DialogFooter className="px-6 py-4">
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Chiudi
            </button>
            <button
              type="button"
              onClick={() => summary && downloadPDFReport(previewTransactions, summary, month)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
            >
              <Download className="w-4 h-4" />
              Scarica PDF
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  disabled={exporting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary py-3 text-sm font-medium text-secondary-foreground active:scale-[0.98] transition-transform cursor-pointer disabled:opacity-50"
                >
                  <FileText className="w-4 h-4" />
                  CSV
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("pdf")}
                  disabled={exporting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary py-3 text-sm font-medium text-secondary-foreground active:scale-[0.98] transition-transform cursor-pointer disabled:opacity-50"
                >
                  <Eye className="w-4 h-4" />
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("excel")}
                  disabled={exporting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary py-3 text-sm font-medium text-secondary-foreground active:scale-[0.98] transition-transform cursor-pointer disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No data for this month.</p>
          </div>
        )}
      </div>
    </div>
  )
}
