import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const SALT_EDGE_API_URL = "https://www.saltedge.com/api/v5"
const SALT_EDGE_APP_ID = process.env.SALT_EDGE_APP_ID || ""
const SALT_EDGE_SECRET = process.env.SALT_EDGE_SECRET || ""

export async function POST(request: Request) {
  try {
    const { returnUrl } = await request.json()
    const supabase = await createClient()

    // Check if we already have a customer ID stored
    const { data: existingConnection } = await supabase
      .from("bank_connections")
      .select("salt_edge_customer_id")
      .limit(1)
      .single()

    let customerId = existingConnection?.salt_edge_customer_id

    // Create new customer if needed
    if (!customerId) {
      const customerResponse = await fetch(`${SALT_EDGE_API_URL}/customers`, {
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

      if (!customerResponse.ok) {
        const error = await customerResponse.text()
        return NextResponse.json({ error: `Failed to create customer: ${error}` }, { status: 500 })
      }

      const customerData = await customerResponse.json()
      customerId = customerData.data.id
    }

    // Create connect session for Raiffeisen
    const sessionResponse = await fetch(`${SALT_EDGE_API_URL}/connect_sessions/create`, {
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
            from_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          },
          attempt: {
            return_to: returnUrl,
          },
          allowed_countries: ["CH"],
          provider_modes: ["oauth"],
        },
      }),
    })

    if (!sessionResponse.ok) {
      const error = await sessionResponse.text()
      return NextResponse.json({ error: `Failed to create session: ${error}` }, { status: 500 })
    }

    const sessionData = await sessionResponse.json()

    return NextResponse.json({
      connectUrl: sessionData.data.connect_url,
      customerId,
    })
  } catch (error) {
    console.error("Bank connect error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
