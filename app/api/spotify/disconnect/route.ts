import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  await supabase.from("spotify_tokens").delete().eq("id", 1)
  return NextResponse.json({ success: true })
}
