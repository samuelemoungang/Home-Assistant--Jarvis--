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
    const url = new URL("https://api.twelvedata.com/time_series")
    url.searchParams.set("symbol", symbol)
    url.searchParams.set("interval", "1day")
    url.searchParams.set("start_date", startDate)
    url.searchParams.set("end_date", new Date().toISOString().split("T")[0])
    url.searchParams.set("order", "ASC")
    url.searchParams.set("apikey", apiKey)

    const response = await fetch(url.toString(), { next: { revalidate: 3600 } })
    if (!response.ok) {
      throw new Error(`History request failed with ${response.status}`)
    }

    const data = await response.json()
    if (!Array.isArray(data?.values) || !data?.meta) {
      throw new Error("Unexpected history response format")
    }

    const result: InvestmentHistoryResponse = {
      asset: {
        symbol: String(data.meta.symbol || symbol),
        name: String(data.meta.symbol || symbol),
        exchange: String(data.meta.exchange || "Unknown"),
        type: String(data.meta.type || "Asset"),
        currency: String(data.meta.currency || "USD"),
      },
      points: data.values
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
