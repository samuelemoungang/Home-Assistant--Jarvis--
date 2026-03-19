"use client"

import { useEffect, useMemo, useState } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { buildHistory, DEFAULT_WATCHLIST, getAssetBySymbol, getDefaultMarketStartDate, getMaxMarketDate, MARKET_ASSETS } from "@/lib/market-data"
import { cn } from "@/lib/utils"
import { LineChart, Plus, Trash2 } from "lucide-react"

const STORAGE_KEY = "finance-investments-watchlist"

function formatDisplayDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatCompactDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

export function InvestmentsPanel() {
  const [watchlist, setWatchlist] = useState<string[]>(DEFAULT_WATCHLIST)
  const [selectedSymbol, setSelectedSymbol] = useState(DEFAULT_WATCHLIST[0])
  const [pendingSymbol, setPendingSymbol] = useState(DEFAULT_WATCHLIST[0])
  const [fromDate, setFromDate] = useState(getDefaultMarketStartDate())

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return

    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const filtered = parsed.filter((symbol) => getAssetBySymbol(symbol))
        if (filtered.length > 0) {
          setWatchlist(filtered)
          setSelectedSymbol(filtered[0])
          setPendingSymbol(filtered[0])
        }
      }
    } catch (error) {
      console.error("Failed to load investments watchlist:", error)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist))
  }, [watchlist])

  const activeAsset = useMemo(() => getAssetBySymbol(selectedSymbol), [selectedSymbol])
  const series = useMemo(() => buildHistory(selectedSymbol, fromDate), [selectedSymbol, fromDate])
  const latestPoint = series[series.length - 1]
  const firstPoint = series[0]

  const availableToAdd = useMemo(
    () => MARKET_ASSETS.filter((asset) => !watchlist.includes(asset.symbol)),
    [watchlist]
  )

  function handleAddSymbol() {
    if (watchlist.includes(pendingSymbol)) {
      setSelectedSymbol(pendingSymbol)
      return
    }

    setWatchlist((current) => [...current, pendingSymbol])
    setSelectedSymbol(pendingSymbol)
  }

  function handleRemoveSymbol(symbol: string) {
    const next = watchlist.filter((item) => item !== symbol)
    if (next.length === 0) return

    setWatchlist(next)
    if (selectedSymbol === symbol) {
      setSelectedSymbol(next[0])
    }
  }

  return (
    <section className="rounded-3xl border border-glass-border bg-glass/90 backdrop-blur-xl p-4 md:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <LineChart className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Investments</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Build a personal watchlist for indices, ETFs, and stocks, then review performance from any start date.
          </p>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-muted-foreground max-w-sm">
          Broker sync is not connected yet. DeGiro does not provide a public official API for this use case, while IBKR can be integrated later with a backend market-data connection.
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-glass-border bg-background/40 p-3">
          <div className="grid gap-3 md:grid-cols-[1.1fr_1fr_auto]">
            <div className="space-y-1">
              <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Add instrument
              </label>
              <Select value={pendingSymbol} onValueChange={setPendingSymbol}>
                <SelectTrigger className="w-full bg-background/70">
                  <SelectValue placeholder="Choose a symbol" />
                </SelectTrigger>
                <SelectContent>
                  {MARKET_ASSETS.map((asset) => (
                    <SelectItem key={asset.symbol} value={asset.symbol}>
                      {asset.symbol} - {asset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                From date
              </label>
              <Input
                type="date"
                value={fromDate}
                max={getMaxMarketDate()}
                onChange={(event) => setFromDate(event.target.value)}
                className="bg-background/70"
              />
            </div>

            <button
              type="button"
              onClick={handleAddSymbol}
              className="h-9 mt-auto inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground active:scale-[0.98] transition-transform cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {watchlist.map((symbol) => {
              const asset = getAssetBySymbol(symbol)
              if (!asset) return null

              return (
                <div
                  key={symbol}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-1.5 py-1 text-xs transition-colors",
                    selectedSymbol === symbol
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-glass-border bg-background/40 text-foreground"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedSymbol(symbol)}
                    className="inline-flex items-center gap-2 rounded-full px-2 py-0.5"
                  >
                    <span className="font-semibold">{symbol}</span>
                    <span className="text-muted-foreground">{asset.type}</span>
                  </button>
                  {watchlist.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSymbol(symbol)}
                      className="inline-flex items-center rounded-full p-1 text-muted-foreground transition-colors hover:text-destructive"
                      aria-label={`Remove ${symbol} from watchlist`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-4 h-64">
            <ChartContainer
              className="h-full w-full"
              config={{
                price: {
                  label: "Price",
                  color: "hsl(var(--primary))",
                },
              }}
            >
              <AreaChart data={series} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="investmentsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-price)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-price)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatCompactDate}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={32}
                />
                <YAxis
                  tickFormatter={(value) => `${value}`}
                  tickLine={false}
                  axisLine={false}
                  width={54}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => {
                        const current = payload?.[0]?.payload
                        return current?.date ? formatDisplayDate(current.date) : ""
                      }}
                      formatter={(value) => (
                        <div className="flex w-full items-center justify-between gap-4">
                          <span className="text-muted-foreground">Price</span>
                          <span className="font-mono text-foreground">
                            {value} {activeAsset?.currency}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="var(--color-price)"
                  strokeWidth={2.5}
                  fill="url(#investmentsGradient)"
                  dot={false}
                />
              </AreaChart>
            </ChartContainer>
          </div>
        </div>

        <div className="grid gap-3 content-start">
          <div className="rounded-2xl border border-glass-border bg-background/40 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Selected asset</p>
            <div className="mt-2">
              <h4 className="text-lg font-semibold text-foreground">{activeAsset?.symbol}</h4>
              <p className="text-sm text-muted-foreground">{activeAsset?.name}</p>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="text-foreground">{activeAsset?.type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Exchange</span>
                <span className="text-foreground">{activeAsset?.exchange}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Available on</span>
                <span className="text-foreground text-right">{activeAsset?.brokers.join(", ")}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-glass-border bg-background/40 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Latest price</p>
              <p className="mt-2 text-xl font-semibold text-foreground">
                {latestPoint?.price.toLocaleString("en-US")} {activeAsset?.currency}
              </p>
            </div>
            <div className="rounded-2xl border border-glass-border bg-background/40 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Return since start</p>
              <p
                className={cn(
                  "mt-2 text-xl font-semibold",
                  (latestPoint?.changePct || 0) >= 0 ? "text-accent" : "text-destructive"
                )}
              >
                {latestPoint?.changePct.toFixed(2)}%
              </p>
            </div>
            <div className="rounded-2xl border border-glass-border bg-background/40 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Start price</p>
              <p className="mt-2 text-xl font-semibold text-foreground">
                {firstPoint?.price.toLocaleString("en-US")} {activeAsset?.currency}
              </p>
            </div>
            <div className="rounded-2xl border border-glass-border bg-background/40 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Tracked points</p>
              <p className="mt-2 text-xl font-semibold text-foreground">{series.length}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-glass-border bg-background/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Next backend step</p>
            <p className="mt-2 text-sm text-muted-foreground">
              This panel is ready to swap the demo history generator with a real market-data adapter for IBKR or another provider.
            </p>
            {availableToAdd.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                More symbols available: {availableToAdd.slice(0, 5).map((asset) => asset.symbol).join(", ")}
                {availableToAdd.length > 5 ? "..." : ""}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
