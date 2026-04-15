import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface SpotifyTokens {
  access_token: string
  refresh_token: string
  expires_at: number
}

export async function readTokens(): Promise<SpotifyTokens | null> {
  const { data, error } = await supabase
    .from("spotify_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("id", 1)
    .single()

  if (error || !data) return null
  return data as SpotifyTokens
}

export async function writeTokens(tokens: SpotifyTokens): Promise<void> {
  await supabase
    .from("spotify_tokens")
    .upsert({ id: 1, ...tokens })
}
