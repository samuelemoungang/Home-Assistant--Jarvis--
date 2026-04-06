import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { categorizeTransaction } from "@/lib/salt-edge"

const SALT_EDGE_API_URL = "https://www.saltedge.com/api/v5"
const SALT_EDGE_APP_ID = process.env.SALT_EDGE_APP_ID || ""
const SALT_EDGE_SECRET = process.env.SALT_EDGE_SECRET || ""

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const connectionId = searchParams.get("connection_id")
  const customerId = searchParams.get("customer_id")

  if (!connectionId || !customerId) {
    return NextResponse.redirect(new URL("/bank-sync?error=missing_params", request.url))
  }

  try {
    const supabase = await createClient()

    // Fetch connection details from Salt Edge
    const connectionResponse = await fetch(
      `${SALT_EDGE_API_URL}/connections/${connectionId}`,
      {
        headers: {
          "App-id": SALT_EDGE_APP_ID,
          "Secret": SALT_EDGE_SECRET,
        },
      }
    )

    if (!connectionResponse.ok) {
      return NextResponse.redirect(new URL("/bank-sync?error=connection_failed", request.url))
    }

    const connectionData = await connectionResponse.json()
    const connection = connectionData.data

    // Store the connection
    const { data: bankConnection, error: insertError } = await supabase
      .from("bank_connections")
      .upsert(
        {
          salt_edge_connection_id: connectionId,
          salt_edge_customer_id: customerId,
          provider_code: connection.provider_code,
          provider_name: connection.provider_name || "Raiffeisen",
          country_code: connection.country_code || "CH",
          status: "active",
        },
        { onConflict: "salt_edge_connection_id" }
      )
      .select()
      .single()

    if (insertError) {
      console.error("Failed to store connection:", insertError)
      return NextResponse.redirect(new URL("/bank-sync?error=storage_failed", request.url))
    }

    // Fetch accounts
    const accountsResponse = await fetch(
      `${SALT_EDGE_API_URL}/accounts?connection_id=${connectionId}`,
      {
        headers: {
          "App-id": SALT_EDGE_APP_ID,
          "Secret": SALT_EDGE_SECRET,
        },
      }
    )

    if (!accountsResponse.ok) {
      return NextResponse.redirect(new URL("/bank-sync?success=connected&sync=pending", request.url))
    }

    const accountsData = await accountsResponse.json()
    const accounts = accountsData.data

    // Fetch transactions for each account
    let totalTransactions = 0
    for (const account of accounts) {
      const txResponse = await fetch(
        `${SALT_EDGE_API_URL}/transactions?connection_id=${connectionId}&account_id=${account.id}`,
        {
          headers: {
            "App-id": SALT_EDGE_APP_ID,
            "Secret": SALT_EDGE_SECRET,
          },
        }
      )

      if (!txResponse.ok) continue

      const txData = await txResponse.json()
      const transactions = txData.data

      // Process and store each transaction
      for (const tx of transactions) {
        const { category, confidence, type } = categorizeTransaction(
          tx.description || "",
          tx.extra?.merchant_name || null,
          tx.amount
        )

        // Determine if auto-confirm (high confidence) or needs review
        const autoConfirm = confidence >= 0.7

        await supabase.from("pending_transactions").upsert(
          {
            bank_connection_id: bankConnection.id,
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
          },
          { onConflict: "salt_edge_transaction_id" }
        )

        // If auto-confirmed, also add to main transactions
        if (autoConfirm) {
          await supabase.from("transactions").upsert(
            {
              type,
              amount: Math.abs(tx.amount),
              category,
              description: tx.extra?.merchant_name || tx.description || "",
              date: tx.made_on,
            },
            { onConflict: "id", ignoreDuplicates: true }
          )
        }

        totalTransactions++
      }
    }

    // Update last synced
    await supabase
      .from("bank_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", bankConnection.id)

    return NextResponse.redirect(
      new URL(`/bank-sync?success=synced&count=${totalTransactions}`, request.url)
    )
  } catch (error) {
    console.error("Callback error:", error)
    return NextResponse.redirect(new URL("/bank-sync?error=unknown", request.url))
  }
}
