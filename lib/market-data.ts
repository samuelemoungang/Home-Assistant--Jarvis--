export type MarketAssetType = "Index" | "ETF" | "Stock"

export interface MarketAsset {
  symbol: string
  name: string
  type: MarketAssetType
  exchange: string
  brokers: string[]
  currency: string
  startingPrice: number
  annualDrift: number
  volatility: number
}

export interface MarketPoint {
  date: string
  price: number
  changePct: number
}

const TODAY = new Date()
const DEFAULT_START = "2023-01-01"

export const MARKET_ASSETS: MarketAsset[] = [
  {
    symbol: "SPY",
    name: "SPDR S&P 500 ETF Trust",
    type: "ETF",
    exchange: "NYSE Arca",
    brokers: ["DeGiro", "IBKR"],
    currency: "USD",
    startingPrice: 380,
    annualDrift: 0.11,
    volatility: 0.16,
  },
  {
    symbol: "QQQ",
    name: "Invesco QQQ Trust",
    type: "ETF",
    exchange: "NASDAQ",
    brokers: ["DeGiro", "IBKR"],
    currency: "USD",
    startingPrice: 310,
    annualDrift: 0.13,
    volatility: 0.2,
  },
  {
    symbol: "VWCE",
    name: "Vanguard FTSE All-World UCITS ETF",
    type: "ETF",
    exchange: "Xetra",
    brokers: ["DeGiro", "IBKR"],
    currency: "EUR",
    startingPrice: 95,
    annualDrift: 0.08,
    volatility: 0.14,
  },
  {
    symbol: "VUAA",
    name: "Vanguard S&P 500 UCITS ETF",
    type: "ETF",
    exchange: "Borsa Italiana",
    brokers: ["DeGiro", "IBKR"],
    currency: "EUR",
    startingPrice: 72,
    annualDrift: 0.1,
    volatility: 0.16,
  },
  {
    symbol: "SXRV",
    name: "iShares Nasdaq 100 UCITS ETF",
    type: "ETF",
    exchange: "Xetra",
    brokers: ["DeGiro", "IBKR"],
    currency: "EUR",
    startingPrice: 710,
    annualDrift: 0.13,
    volatility: 0.22,
  },
  {
    symbol: "^GSPC",
    name: "S&P 500 Index",
    type: "Index",
    exchange: "US",
    brokers: ["IBKR"],
    currency: "USD",
    startingPrice: 4200,
    annualDrift: 0.09,
    volatility: 0.15,
  },
  {
    symbol: "^NDX",
    name: "Nasdaq-100 Index",
    type: "Index",
    exchange: "US",
    brokers: ["IBKR"],
    currency: "USD",
    startingPrice: 12800,
    annualDrift: 0.12,
    volatility: 0.19,
  },
  {
    symbol: "^STOXX50E",
    name: "EURO STOXX 50 Index",
    type: "Index",
    exchange: "EU",
    brokers: ["IBKR"],
    currency: "EUR",
    startingPrice: 4100,
    annualDrift: 0.07,
    volatility: 0.13,
  },
  {
    symbol: "AAPL",
    name: "Apple",
    type: "Stock",
    exchange: "NASDAQ",
    brokers: ["DeGiro", "IBKR"],
    currency: "USD",
    startingPrice: 150,
    annualDrift: 0.17,
    volatility: 0.24,
  },
  {
    symbol: "MSFT",
    name: "Microsoft",
    type: "Stock",
    exchange: "NASDAQ",
    brokers: ["DeGiro", "IBKR"],
    currency: "USD",
    startingPrice: 280,
    annualDrift: 0.16,
    volatility: 0.21,
  },
  {
    symbol: "NVDA",
    name: "NVIDIA",
    type: "Stock",
    exchange: "NASDAQ",
    brokers: ["DeGiro", "IBKR"],
    currency: "USD",
    startingPrice: 180,
    annualDrift: 0.24,
    volatility: 0.35,
  },
  {
    symbol: "ASML",
    name: "ASML Holding",
    type: "Stock",
    exchange: "Euronext Amsterdam",
    brokers: ["DeGiro", "IBKR"],
    currency: "EUR",
    startingPrice: 560,
    annualDrift: 0.15,
    volatility: 0.23,
  },
]

export const DEFAULT_WATCHLIST = ["VWCE", "SPY", "AAPL"]

export function getDefaultMarketStartDate() {
  return DEFAULT_START
}

export function getMaxMarketDate() {
  return TODAY.toISOString().split("T")[0]
}

export function getAssetBySymbol(symbol: string) {
  return MARKET_ASSETS.find((asset) => asset.symbol === symbol)
}

export function buildHistory(symbol: string, startDate = DEFAULT_START) {
  const asset = getAssetBySymbol(symbol)
  if (!asset) return []

  const from = new Date(startDate)
  const safeFrom = Number.isNaN(from.getTime()) ? new Date(DEFAULT_START) : from
  const firstPrice = asset.startingPrice
  const history: MarketPoint[] = []
  let price = firstPrice
  const seed = buildSeed(symbol)
  let index = 0

  for (let cursor = new Date(safeFrom); cursor <= TODAY; cursor.setDate(cursor.getDate() + 7)) {
    const wave = Math.sin((index + seed) / 3.2) * asset.volatility * 0.28
    const noise = pseudoRandom(seed + index) * asset.volatility * 0.12
    const weeklyDrift = asset.annualDrift / 52
    price = Math.max(asset.startingPrice * 0.45, price * (1 + weeklyDrift + wave * 0.02 + noise * 0.01))

    history.push({
      date: cursor.toISOString().split("T")[0],
      price: Number(price.toFixed(2)),
      changePct: Number((((price - firstPrice) / firstPrice) * 100).toFixed(2)),
    })
    index += 1
  }

  return history
}

function buildSeed(symbol: string) {
  return symbol.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

function pseudoRandom(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x) - 0.5
}
