import { NextResponse } from "next/server"
import { MARKET_ASSETS } from "@/lib/market-data"
import type { InvestmentSearchResult } from "@/lib/investments"

function fallbackSearch(query: string): InvestmentSearchResult[] {
  const lower = query.toLowerCase()

  return MARKET_ASSETS
    .filter((asset) => asset.symbol.toLowerCase().includes(lower) || asset.name.toLowerCase().includes(lower))
    .slice(0, 12)
    .map((asset) => ({
      symbol: asset.symbol,
      name: asset.name,
      exchange: asset.exchange,
      type: asset.type,
      currency: asset.currency,
    }))
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim()

  if (!query) {
    return NextResponse.json({ results: [] })
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY
  if (!apiKey) {
    return NextResponse.json({ results: fallbackSearch(query), source: "fallback" })
  }

  try {
    const url = new URL("https://api.twelvedata.com/symbol_search")
    url.searchParams.set("symbol", query)
    url.searchParams.set("outputsize", "12")
    url.searchParams.set("apikey", apiKey)

    const response = await fetch(url.toString(), { next: { revalidate: 3600 } })
    if (!response.ok) {
      throw new Error(`Search request failed with ${response.status}`)
    }

    const data = await response.json()
    const results = Array.isArray(data?.data)
      ? data.data
          .filter((item: Record<string, unknown>) => {
            const instrumentType = String(item.instrument_type || item.type || "").toLowerCase()
            return instrumentType.includes("stock") || instrumentType.includes("etf") || instrumentType.includes("index")
          })
          .map((item: Record<string, unknown>) => ({
            symbol: String(item.symbol || ""),
            name: String(item.instrument_name || item.name || item.symbol || ""),
            exchange: String(item.exchange || item.exchange_name || "Unknown"),
            type: String(item.instrument_type || item.type || "Asset"),
            currency: String(item.currency || "USD"),
          }))
      : []

    return NextResponse.json({ results, source: "provider" })
  } catch (error) {
    console.error("Market search failed, using fallback:", error)
    return NextResponse.json({ results: fallbackSearch(query), source: "fallback" })
  }
}
