"use client"

import { useEffect, useMemo, useState } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ArrowLeft, LineChart, Search, Wallet } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { GlassCard } from "@/components/dashboard/glass-card"
import {
  calculateInvestmentMetrics,
  getDefaultInvestmentStartDate,
  type InvestmentHistoryPoint,
  type InvestmentHistoryResponse,
  type InvestmentSearchResult,
  type TrackedInvestment,
} from "@/lib/investments"
import type { Screen } from "@/lib/navigation"
import { cn } from "@/lib/utils"

interface InvestmentsScreenProps {
  onNavigate: (screen: Screen) => void
}

const STORAGE_KEY = "finance-investments-positions"

function formatAxisDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatLongDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function InvestmentsScreen({ onNavigate }: InvestmentsScreenProps) {
  const [positions, setPositions] = useState<TrackedInvestment[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<InvestmentSearchResult[]>([])
  const [selectedResult, setSelectedResult] = useState<InvestmentSearchResult | null>(null)
  const [startDate, setStartDate] = useState(getDefaultInvestmentStartDate())
  const [investedAmount, setInvestedAmount] = useState("")
  const [history, setHistory] = useState<InvestmentHistoryPoint[]>([])
  const [dataSource, setDataSource] = useState<"provider" | "fallback">("fallback")
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [searchError, setSearchError] = useState("")
  const [historyError, setHistoryError] = useState("")

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return

    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        setPositions(parsed)
        setSelectedId(parsed[0].id)
      }
    } catch (error) {
      console.error("Failed to load positions:", error)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(positions))
  }, [positions])

  useEffect(() => {
    if (selectedResult) {
      setSearchResults([])
      setSearchError("")
      return
    }

    if (query.trim().length < 2) {
      setSearchResults([])
      setSearchError("")
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setIsSearching(true)
      setSearchError("")

      try {
        const response = await fetch(`/api/market/search?q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
        })
        const data = await response.json()
        setSearchResults(Array.isArray(data?.results) ? data.results : [])
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Search failed:", error)
          setSearchError("Search is currently unavailable.")
        }
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [query, selectedResult])

  const selectedPosition = useMemo(
    () => positions.find((position) => position.id === selectedId) || null,
    [positions, selectedId]
  )

  useEffect(() => {
    if (!selectedPosition) {
      setHistory([])
      return
    }

    const controller = new AbortController()

    async function loadHistory() {
      setIsLoadingHistory(true)
      setHistoryError("")

      try {
        const response = await fetch(
          `/api/market/history?symbol=${encodeURIComponent(selectedPosition.symbol)}&startDate=${selectedPosition.startDate}`,
          { signal: controller.signal }
        )
        const data: InvestmentHistoryResponse = await response.json()

        if (!response.ok) {
          throw new Error("Unable to load market history.")
        }

        setHistory(Array.isArray(data.points) ? data.points : [])
        setDataSource(data.source)
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("History failed:", error)
          setHistoryError("Unable to load price history for this instrument.")
          setHistory([])
        }
      } finally {
        setIsLoadingHistory(false)
      }
    }

    loadHistory()

    return () => controller.abort()
  }, [selectedPosition])

  const metrics = useMemo(
    () => calculateInvestmentMetrics(history, selectedPosition?.investedAmount || 0),
    [history, selectedPosition]
  )

  function handleAddPosition() {
    if (!selectedResult) {
      setSearchError("Choose an instrument before adding it.")
      return
    }

    const nextAmount = Number(investedAmount || 0)
    const nextPosition: TrackedInvestment = {
      ...selectedResult,
      id: selectedResult.symbol,
      startDate,
      investedAmount: Number.isFinite(nextAmount) ? nextAmount : 0,
    }

    setPositions((current) => {
      const existing = current.filter((position) => position.id !== nextPosition.id)
      return [nextPosition, ...existing]
    })
    setSelectedId(nextPosition.id)
    setQuery("")
    setSearchResults([])
    setSelectedResult(null)
    setSearchError("")
  }

  function handleUpdateAmount(value: string) {
    if (!selectedPosition) return
    const nextAmount = Number(value || 0)

    setPositions((current) =>
      current.map((position) =>
        position.id === selectedPosition.id
          ? { ...position, investedAmount: Number.isFinite(nextAmount) ? nextAmount : 0 }
          : position
      )
    )
  }

  function handleRemovePosition(id: string) {
    const next = positions.filter((position) => position.id !== id)
    setPositions(next)
    if (selectedId === id) {
      setSelectedId(next[0]?.id || null)
    }
  }

  return (
    <div className="relative w-full h-full overflow-y-auto p-4">
      <GlassCard position="bottom-right" onClick={() => onNavigate("finance")}>
        <ArrowLeft className="w-5 h-5 text-primary" />
        <span className="text-xs font-medium text-foreground">Back</span>
      </GlassCard>

      <div className="mx-auto flex max-w-6xl flex-col gap-5 pt-4 pb-20">
        <div className="space-y-1 text-center">
          <h2 className="text-lg font-semibold text-foreground">Investments</h2>
          <p className="text-xs text-muted-foreground">
            Add a stock, ETF, or index, choose when you started investing, and estimate your performance from that date.
          </p>
        </div>

        <div className="rounded-3xl border border-glass-border bg-glass/90 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.12)] backdrop-blur-xl md:p-5">
          <div className="grid gap-3 lg:grid-cols-[1.55fr_1fr]">
            <div className="rounded-2xl border border-glass-border bg-background/40 p-4">
              <div className="grid gap-3 md:grid-cols-[1.4fr_0.9fr_0.9fr_auto]">
                <div className="relative space-y-1">
                  <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Search instrument
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value)
                        setSelectedResult(null)
                      }}
                      placeholder="Search by ticker or name"
                      className="bg-background/70 pl-10"
                    />
                  </div>

                  {query.trim().length >= 2 && !selectedResult && (
                    <div className="absolute z-20 mt-1 w-full rounded-xl border border-glass-border bg-card/95 p-1 shadow-2xl backdrop-blur-xl">
                      {isSearching ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground">Searching...</p>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((result) => (
                          <button
                            key={`${result.symbol}-${result.exchange}`}
                            type="button"
                            onClick={() => {
                              setSelectedResult(result)
                              setQuery(`${result.symbol} - ${result.name}`)
                              setSearchResults([])
                            }}
                            className="flex w-full flex-col items-start rounded-lg px-3 py-2 text-left hover:bg-secondary/60"
                          >
                            <span className="text-sm font-medium text-foreground">{result.symbol} - {result.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {result.type} | {result.exchange} | {result.currency}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-2 text-xs text-muted-foreground">No results found.</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Start date
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="bg-background/70"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Invested amount
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={investedAmount}
                    onChange={(event) => setInvestedAmount(event.target.value)}
                    placeholder="Optional"
                    className="bg-background/70"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddPosition}
                  className="mt-auto inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-transform active:scale-[0.98]"
                >
                  Add
                </button>
              </div>

              {(searchError || selectedResult) && (
                <div className="mt-3 rounded-xl border border-glass-border bg-background/30 px-3 py-2 text-xs text-muted-foreground">
                  {searchError || `Selected: ${selectedResult?.symbol} - ${selectedResult?.name}`}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {positions.map((position) => (
                  <div
                    key={position.id}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-1.5 py-1 text-xs transition-colors",
                      selectedPosition?.id === position.id
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-glass-border bg-background/40 text-foreground"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(position.id)}
                      className="inline-flex items-center gap-2 rounded-full px-2 py-0.5"
                    >
                      <span className="font-semibold">{position.symbol}</span>
                      <span className="text-muted-foreground">{position.startDate}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemovePosition(position.id)}
                      className="rounded-full px-2 py-0.5 text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {positions.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No positions added yet. Search for a symbol, set your start date, and add it here.
                  </p>
                )}
              </div>

              <div className="mt-4 h-72 rounded-2xl border border-glass-border bg-background/20 p-3">
                {selectedPosition ? (
                  isLoadingHistory ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading chart...</div>
                  ) : history.length > 0 ? (
                    <ChartContainer
                      className="h-full w-full"
                      config={{
                        close: {
                          label: "Close",
                          color: "hsl(var(--primary))",
                        },
                      }}
                    >
                      <AreaChart data={history} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
                        <defs>
                          <linearGradient id="investmentsScreenGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-close)" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="var(--color-close)" stopOpacity={0.03} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={formatAxisDate} tickLine={false} axisLine={false} minTickGap={32} />
                        <YAxis tickLine={false} axisLine={false} width={60} />
                        <ChartTooltip
                          cursor={false}
                          content={
                            <ChartTooltipContent
                              labelFormatter={(_, payload) => {
                                const current = payload?.[0]?.payload
                                return current?.date ? formatLongDate(current.date) : ""
                              }}
                              formatter={(value) => (
                                <div className="flex w-full items-center justify-between gap-4">
                                  <span className="text-muted-foreground">Close</span>
                                  <span className="font-mono text-foreground">
                                    {value} {selectedPosition.currency}
                                  </span>
                                </div>
                              )}
                            />
                          }
                        />
                        <Area
                          type="monotone"
                          dataKey="close"
                          stroke="var(--color-close)"
                          strokeWidth={2.5}
                          fill="url(#investmentsScreenGradient)"
                          dot={false}
                        />
                      </AreaChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      {historyError || "No price data available for this selection."}
                    </div>
                  )
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
                    <LineChart className="h-8 w-8 opacity-40" />
                    <p className="text-sm">Select a position to see its performance chart.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid content-start gap-3">
              <div className="rounded-2xl border border-glass-border bg-background/40 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Selected position</p>
                {selectedPosition ? (
                  <>
                    <div className="mt-2">
                      <h3 className="text-lg font-semibold text-foreground">{selectedPosition.symbol}</h3>
                      <p className="text-sm text-muted-foreground">{selectedPosition.name}</p>
                    </div>
                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Asset class</span>
                        <span className="text-foreground">{selectedPosition.type}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Exchange</span>
                        <span className="text-foreground">{selectedPosition.exchange}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Start date</span>
                        <span className="text-foreground">{selectedPosition.startDate}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Data source</span>
                        <span className="text-foreground">{dataSource === "provider" ? "Twelve Data" : "Fallback dataset"}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">Add your first position to start tracking performance.</p>
                )}
              </div>

              <div className="rounded-2xl border border-glass-border bg-background/40 p-4">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Invested capital</p>
                </div>
                <div className="mt-3">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={selectedPosition?.investedAmount ?? ""}
                    onChange={(event) => handleUpdateAmount(event.target.value)}
                    placeholder="Enter invested amount"
                    className="bg-background/70"
                    disabled={!selectedPosition}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Assumes a one-time investment made on the selected start date.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-glass-border bg-background/40 p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Return since start</p>
                  <p className={cn("mt-2 text-xl font-semibold", (metrics?.returnPct || 0) >= 0 ? "text-accent" : "text-destructive")}>
                    {metrics ? `${metrics.returnPct.toFixed(2)}%` : "--"}
                  </p>
                </div>
                <div className="rounded-2xl border border-glass-border bg-background/40 p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Profit / Loss</p>
                  <p className={cn("mt-2 text-xl font-semibold", (metrics?.profitLoss || 0) >= 0 ? "text-accent" : "text-destructive")}>
                    {metrics ? `${metrics.profitLoss.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${selectedPosition?.currency}` : "--"}
                  </p>
                </div>
                <div className="rounded-2xl border border-glass-border bg-background/40 p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Start price</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {metrics ? `${metrics.startPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${selectedPosition?.currency}` : "--"}
                  </p>
                </div>
                <div className="rounded-2xl border border-glass-border bg-background/40 p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Current value</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {metrics ? `${metrics.currentValue.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${selectedPosition?.currency}` : "--"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-glass-border bg-background/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">How it is calculated</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  The app compares the closing price on your start date with the latest available close, then applies that percentage change to your invested amount.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
