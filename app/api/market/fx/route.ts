import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get("from")?.trim().toUpperCase()
  const to = searchParams.get("to")?.trim().toUpperCase()

  if (!from || !to) {
    return NextResponse.json({ error: "Missing from or to currency" }, { status: 400 })
  }

  if (from === to) {
    return NextResponse.json({ from, to, rate: 1, source: "identity" })
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "FX provider API key is missing" }, { status: 503 })
  }

  try {
    const url = new URL("https://api.twelvedata.com/time_series")
    url.searchParams.set("symbol", `${from}/${to}`)
    url.searchParams.set("interval", "1day")
    url.searchParams.set("outputsize", "1")
    url.searchParams.set("order", "DESC")
    url.searchParams.set("apikey", apiKey)

    const response = await fetch(url.toString(), { next: { revalidate: 3600 } })
    if (!response.ok) {
      throw new Error(`FX request failed with ${response.status}`)
    }

    const data = await response.json()
    const latest = Array.isArray(data?.values) ? data.values[0] : null
    const rate = latest ? Number(latest.close) : NaN

    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error("Invalid FX rate response")
    }

    return NextResponse.json({ from, to, rate, source: "provider" })
  } catch (error) {
    console.error(`FX conversion failed for ${from}/${to}:`, error)
    return NextResponse.json({ error: `Unable to convert ${from} to ${to}` }, { status: 502 })
  }
}
