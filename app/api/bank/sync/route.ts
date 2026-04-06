import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { categorizeTransaction } from "@/lib/salt-edge"

const SALT_EDGE_API_URL = "https://www.saltedge.com/api/v5"
const SALT_EDGE_APP_ID = process.env.SALT_EDGE_APP_ID || ""
const SALT_EDGE_SECRET = process.env.SALT_EDGE_SECRET || ""

export async function POST() {
  try {
    const supabase = await createClient()

    // Get all active connections
    const { data: connections, error: connError } = await supabase
      .from("bank_connections")
      .select("*")
      .eq("status", "active")

    if (connError || !connections?.length) {
      return NextResponse.json({ error: "No active connections" }, { status: 400 })
    }

    let totalNew = 0
    let totalAutoConfirmed = 0

    for (const conn of connections) {
      // Fetch accounts
      const accountsResponse = await fetch(
        `${SALT_EDGE_API_URL}/accounts?connection_id=${conn.salt_edge_connection_id}`,
        {
          headers: {
            "App-id": SALT_EDGE_APP_ID,
            "Secret": SALT_EDGE_SECRET,
          },
        }
      )

      if (!accountsResponse.ok) continue

      const accountsData = await accountsResponse.json()

      for (const account of accountsData.data) {
        // Fetch transactions since last sync
        const fromDate = conn.last_synced_at
          ? new Date(conn.last_synced_at).toISOString().split("T")[0]
          : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

        const txResponse = await fetch(
          `${SALT_EDGE_API_URL}/transactions?connection_id=${conn.salt_edge_connection_id}&account_id=${account.id}&from_date=${fromDate}`,
          {
            headers: {
              "App-id": SALT_EDGE_APP_ID,
              "Secret": SALT_EDGE_SECRET,
            },
          }
        )

        if (!txResponse.ok) continue

        const txData = await txResponse.json()

        for (const tx of txData.data) {
          // Check if already exists
          const { data: existing } = await supabase
            .from("pending_transactions")
            .select("id")
            .eq("salt_edge_transaction_id", tx.id)
            .single()

          if (existing) continue

          const { category, confidence, type } = categorizeTransaction(
            tx.description || "",
            tx.extra?.merchant_name || null,
            tx.amount
          )

          const autoConfirm = confidence >= 0.7

          await supabase.from("pending_transactions").insert({
            bank_connection_id: conn.id,
            salt_edge_transaction_id: tx.id,
            amount: tx.amount,
            currency: tx.currency_code || "CHF",
            description: tx.description,
            merchant_name: tx.extra?.merchant_name || null,
            made_on: tx.made_on,
            category_suggestion: category,
            category_confidence: confidence,
            transaction_type: type,
            status: autoConfirm ? "confirmed" : "pending",
            raw_data: tx,
          })

          if (autoConfirm) {
            await supabase.from("transactions").insert({
              type,
              amount: Math.abs(tx.amount),
              category,
              description: tx.extra?.merchant_name || tx.description || "",
              date: tx.made_on,
            })
            totalAutoConfirmed++
          }

          totalNew++
        }
      }

      // Update last synced
      await supabase
        .from("bank_connections")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", conn.id)
    }

    return NextResponse.json({
      success: true,
      newTransactions: totalNew,
      autoConfirmed: totalAutoConfirmed,
      needsReview: totalNew - totalAutoConfirmed,
    })
  } catch (error) {
    console.error("Sync error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    )
  }
}
