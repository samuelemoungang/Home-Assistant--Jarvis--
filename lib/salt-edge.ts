import { createClient } from "@/lib/supabase/client"
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories"

// Salt Edge API configuration
const SALT_EDGE_API_URL = "https://www.saltedge.com/api/v5"
const SALT_EDGE_APP_ID = process.env.NEXT_PUBLIC_SALT_EDGE_APP_ID || ""
const SALT_EDGE_SECRET = process.env.SALT_EDGE_SECRET || ""

// Category mapping from merchant/description keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Food: ["migros", "coop", "denner", "aldi", "lidl", "spar", "restaurant", "mcdonald", "burger", "pizza", "cafe", "coffee", "starbucks", "bakery", "food"],
  Transport: ["sbb", "zvv", "tpg", "bls", "uber", "taxi", "parking", "petrol", "benzin", "shell", "bp", "eni", "garage", "auto"],
  Housing: ["rent", "miete", "wohnung", "immobilien", "hauswart", "nebenkosten"],
  Utilities: ["swisscom", "sunrise", "salt", "upc", "ewz", "elektrizität", "strom", "gas", "wasser", "internet", "mobile"],
  Entertainment: ["netflix", "spotify", "apple", "google play", "cinema", "kino", "theater", "concert", "ticket"],
  Health: ["apotheke", "pharmacy", "doctor", "arzt", "hospital", "spital", "dentist", "zahnarzt", "physio", "fitness", "gym"],
  Shopping: ["zalando", "h&m", "zara", "manor", "globus", "jelmoli", "ikea", "amazon", "digitec", "galaxus", "microspot"],
  Education: ["schule", "university", "uni", "eth", "course", "kurs", "buch", "book"],
  Insurance: ["versicherung", "insurance", "axa", "zurich", "helvetia", "mobiliar", "css", "swica", "helsana"],
  Salary: ["lohn", "salary", "gehalt", "payroll"],
  Freelance: ["honorar", "freelance", "projekt", "consulting"],
  Investment: ["dividend", "zins", "interest", "kapital", "rendite"],
}

export interface BankConnection {
  id: string
  salt_edge_connection_id: string
  salt_edge_customer_id: string
  provider_code: string
  provider_name: string
  country_code: string
  status: string
  last_synced_at: string | null
  created_at: string
}

export interface PendingTransaction {
  id: string
  bank_connection_id: string
  salt_edge_transaction_id: string
  amount: number
  currency: string
  description: string | null
  merchant_name: string | null
  made_on: string
  category_suggestion: string | null
  category_confidence: number
  transaction_type: "income" | "expense"
  status: "pending" | "confirmed" | "rejected"
  raw_data: Record<string, unknown>
  created_at: string
}

// Auto-categorize transaction based on description/merchant
export function categorizeTransaction(
  description: string,
  merchantName: string | null,
  amount: number
): { category: string; confidence: number; type: "income" | "expense" } {
  const searchText = `${description} ${merchantName || ""}`.toLowerCase()
  const type = amount >= 0 ? "income" : "expense"
  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  let bestMatch = { category: "Other", confidence: 0 }

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (!categories.includes(category)) continue

    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        const confidence = keyword.length > 4 ? 0.9 : 0.7
        if (confidence > bestMatch.confidence) {
          bestMatch = { category, confidence }
        }
      }
    }
  }

  return { ...bestMatch, type }
}

// Salt Edge API helpers (server-side only)
export async function createSaltEdgeCustomer(): Promise<string> {
  const response = await fetch(`${SALT_EDGE_API_URL}/customers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "App-id": SALT_EDGE_APP_ID,
      "Secret": SALT_EDGE_SECRET,
    },
    body: JSON.stringify({
      data: {
        identifier: `pi-dashboard-${Date.now()}`,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to create customer: ${response.statusText}`)
  }

  const data = await response.json()
  return data.data.id
}

export async function createConnectSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const response = await fetch(`${SALT_EDGE_API_URL}/connect_sessions/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "App-id": SALT_EDGE_APP_ID,
      "Secret": SALT_EDGE_SECRET,
    },
    body: JSON.stringify({
      data: {
        customer_id: customerId,
        consent: {
          scopes: ["account_details", "transactions_details"],
          from_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // Last 90 days
        },
        attempt: {
          return_to: returnUrl,
        },
        provider_code: "raiffeisen_oauth_client_ch",
        country_code: "CH",
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to create connect session: ${response.statusText}`)
  }

  const data = await response.json()
  return data.data.connect_url
}

export async function fetchTransactions(
  connectionId: string,
  accountId: string,
  fromDate?: string
): Promise<Array<Record<string, unknown>>> {
  const params = new URLSearchParams({
    connection_id: connectionId,
    account_id: accountId,
  })
  if (fromDate) {
    params.append("from_date", fromDate)
  }

  const response = await fetch(`${SALT_EDGE_API_URL}/transactions?${params}`, {
    headers: {
      "App-id": SALT_EDGE_APP_ID,
      "Secret": SALT_EDGE_SECRET,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch transactions: ${response.statusText}`)
  }

  const data = await response.json()
  return data.data
}

export async function fetchAccounts(
  connectionId: string
): Promise<Array<{ id: string; name: string; balance: number; currency: string }>> {
  const response = await fetch(
    `${SALT_EDGE_API_URL}/accounts?connection_id=${connectionId}`,
    {
      headers: {
        "App-id": SALT_EDGE_APP_ID,
        "Secret": SALT_EDGE_SECRET,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch accounts: ${response.statusText}`)
  }

  const data = await response.json()
  return data.data.map((acc: Record<string, unknown>) => ({
    id: acc.id,
    name: acc.name,
    balance: acc.balance,
    currency: acc.currency_code,
  }))
}

// Client-side Supabase operations
export async function getBankConnections(): Promise<BankConnection[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("bank_connections")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function getPendingTransactions(
  status: "pending" | "confirmed" | "rejected" = "pending"
): Promise<PendingTransaction[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("pending_transactions")
    .select("*")
    .eq("status", status)
    .order("made_on", { ascending: false })

  if (error) throw error
  return data || []
}

export async function confirmTransaction(
  pendingId: string,
  category: string,
  type: "income" | "expense"
): Promise<void> {
  const supabase = createClient()

  // Get the pending transaction
  const { data: pending, error: fetchError } = await supabase
    .from("pending_transactions")
    .select("*")
    .eq("id", pendingId)
    .single()

  if (fetchError || !pending) throw fetchError || new Error("Transaction not found")

  // Insert into main transactions table
  const { error: insertError } = await supabase.from("transactions").insert({
    type,
    amount: Math.abs(pending.amount),
    category,
    description: pending.merchant_name || pending.description || "",
    date: pending.made_on,
  })

  if (insertError) throw insertError

  // Mark as confirmed
  const { error: updateError } = await supabase
    .from("pending_transactions")
    .update({ status: "confirmed" })
    .eq("id", pendingId)

  if (updateError) throw updateError
}

export async function rejectTransaction(pendingId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("pending_transactions")
    .update({ status: "rejected" })
    .eq("id", pendingId)

  if (error) throw error
}

export async function confirmAllCategorized(): Promise<number> {
  const supabase = createClient()

  // Get all pending with high confidence
  const { data: pending, error: fetchError } = await supabase
    .from("pending_transactions")
    .select("*")
    .eq("status", "pending")
    .gte("category_confidence", 0.7)

  if (fetchError) throw fetchError
  if (!pending || pending.length === 0) return 0

  // Insert all into transactions
  const transactions = pending.map((p) => ({
    type: p.transaction_type,
    amount: Math.abs(p.amount),
    category: p.category_suggestion || "Other",
    description: p.merchant_name || p.description || "",
    date: p.made_on,
  }))

  const { error: insertError } = await supabase.from("transactions").insert(transactions)
  if (insertError) throw insertError

  // Mark all as confirmed
  const ids = pending.map((p) => p.id)
  const { error: updateError } = await supabase
    .from("pending_transactions")
    .update({ status: "confirmed" })
    .in("id", ids)

  if (updateError) throw updateError

  return pending.length
}
