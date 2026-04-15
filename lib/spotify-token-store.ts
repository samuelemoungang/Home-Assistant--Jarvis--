import fs from "fs"
import path from "path"

const TOKEN_FILE = path.join(process.cwd(), "data", "spotify-tokens.json")

export interface SpotifyTokens {
  access_token: string
  refresh_token: string
  expires_at: number
}

export function readTokens(): SpotifyTokens | null {
  try {
    if (!fs.existsSync(TOKEN_FILE)) return null
    const data = fs.readFileSync(TOKEN_FILE, "utf-8")
    return JSON.parse(data) as SpotifyTokens
  } catch {
    return null
  }
}

export function writeTokens(tokens: SpotifyTokens): void {
  const dir = path.dirname(TOKEN_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2))
}
