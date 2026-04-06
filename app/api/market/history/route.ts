import { NextResponse } from "next/server"
import { buildHistory, getAssetBySymbol } from "@/lib/market-data"
import type { InvestmentHistoryResponse } from "@/lib/investments"

function fallbackHistory(symbol: string, startDate: string): InvestmentHistoryResponse | null {
  const asset = getAssetBySymbol(symbol)
  if (!asset) return null

  return {
    asset: {
      symbol: asset.symbol,
      name: asset.name,
      exchange: asset.exchange,
      type: asset.type,
      currency: asset.currency,
      providerSymbol: asset.symbol,
    },
    points: buildHistory(symbol, startDate).map((point) => ({
      date: point.date,
      close: point.price,
    })),
    source: "fallback",
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol")?.trim()
  const startDate = searchParams.get("startDate")?.trim()
  const providerSymbol = searchParams.get("providerSymbol")?.trim()
  const exchange = searchParams.get("exchange")?.trim()

  if (!symbol || !startDate) {
    return NextResponse.json({ error: "Missing symbol or startDate" }, { status: 400 })
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY
  if (!apiKey) {
    const fallback = fallbackHistory(symbol, startDate)
    if (!fallback) {
      return NextResponse.json({ error: "Instrument not found" }, { status: 404 })
    }
    return NextResponse.json(fallback)
  }

  try {
    const symbolCandidates = buildSymbolCandidates({ symbol, providerSymbol, exchange })
    let data: Record<string, unknown> | null = null
    let resolvedProviderSymbol = symbol

    for (const candidate of symbolCandidates) {
      const url = new URL("https://api.twelvedata.com/time_series")
      url.searchParams.set("symbol", candidate)
      url.searchParams.set("interval", "1day")
      url.searchParams.set("start_date", startDate)
      url.searchParams.set("end_date", new Date().toISOString().split("T")[0])
      url.searchParams.set("order", "ASC")
      url.searchParams.set("apikey", apiKey)

      const response = await fetch(url.toString(), { next: { revalidate: 3600 } })
      if (!response.ok) {
        continue
      }

      const payload = await response.json()
      if (Array.isArray(payload?.values) && payload?.meta) {
        data = payload
        resolvedProviderSymbol = candidate
        break
      }
    }

    if (!data || !Array.isArray(data?.values) || !data?.meta) {
      throw new Error("Unexpected history response format")
    }

    const result: InvestmentHistoryResponse = {
      asset: {
        symbol: String((data.meta as Record<string, unknown>).symbol || symbol),
        name: String(data.meta.symbol || symbol),
        exchange: String((data.meta as Record<string, unknown>).exchange || exchange || "Unknown"),
        type: String((data.meta as Record<string, unknown>).type || "Asset"),
        currency: String((data.meta as Record<string, unknown>).currency || "USD"),
        providerSymbol: resolvedProviderSymbol,
      },
      points: (data.values as Record<string, string>[])
        .map((value: Record<string, string>) => ({
          date: String(value.datetime || value.date || "").split(" ")[0],
          close: Number(value.close),
        }))
        .filter((point: { date: string; close: number }) => point.date && Number.isFinite(point.close)),
      source: "provider",
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Market history failed, using fallback:", error)
    const fallback = fallbackHistory(symbol, startDate)
    if (!fallback) {
      return NextResponse.json({ error: "Instrument not found" }, { status: 404 })
    }
    return NextResponse.json(fallback)
  }
}

function buildSymbolCandidates({
  symbol,
  providerSymbol,
  exchange,
}: {
  symbol: string
  providerSymbol?: string
  exchange?: string
}) {
  const candidates = new Set<string>()
  if (providerSymbol) candidates.add(providerSymbol)
  candidates.add(symbol)

  const normalizedExchange = normalizeMicCode(exchange)
  if (normalizedExchange) {
    candidates.add(`${symbol}:${normalizedExchange}`)
  }

  return Array.from(candidates)
}

function normalizeMicCode(exchange?: string) {
  if (!exchange) return ""
  const upper = exchange.toUpperCase()

  if (/^[A-Z]{4}$/.test(upper)) return upper

  const exchangeMap: Record<string, string> = {
    XETRA: "XETR",
    "BORSA ITALIANA": "XMIL",
    "EURONEXT AMSTERDAM": "XAMS",
    "EURONEXT PARIS": "XPAR",
    NASDAQ: "XNAS",
    NYSE: "XNYS",
    "NYSE ARCA": "ARCX",
    LSE: "XLON",
  }

  return exchangeMap[upper] || ""
}
