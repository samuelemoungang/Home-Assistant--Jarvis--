export interface InvestmentSearchResult {
  symbol: string
  name: string
  exchange: string
  type: string
  currency: string
}

export interface InvestmentHistoryPoint {
  date: string
  close: number
}

export interface TrackedInvestment extends InvestmentSearchResult {
  id: string
  startDate: string
  investedAmount: number
}

export interface InvestmentHistoryResponse {
  asset: InvestmentSearchResult
  points: InvestmentHistoryPoint[]
  source: "provider" | "fallback"
}

export interface InvestmentMetrics {
  startPrice: number
  latestPrice: number
  returnPct: number
  currentValue: number
  profitLoss: number
}

export function getDefaultInvestmentStartDate() {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 1)
  return date.toISOString().split("T")[0]
}

export function calculateInvestmentMetrics(points: InvestmentHistoryPoint[], investedAmount: number): InvestmentMetrics | null {
  if (points.length === 0) return null

  const startPrice = points[0].close
  const latestPrice = points[points.length - 1].close
  const returnPct = ((latestPrice - startPrice) / startPrice) * 100
  const currentValue = investedAmount > 0 ? investedAmount * (1 + returnPct / 100) : 0
  const profitLoss = currentValue - investedAmount

  return {
    startPrice,
    latestPrice,
    returnPct,
    currentValue,
    profitLoss,
  }
}
