import { NextRequest, NextResponse } from "next/server"
import { writeTokens } from "@/lib/spotify-token-store"

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")
  const error = req.nextUrl.searchParams.get("error")

  if (error) {
    return NextResponse.json({ error: `Spotify auth denied: ${error}` }, { status: 400 })
  }

  if (!code) {
    return NextResponse.json({ error: "No authorization code received" }, { status: 400 })
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID!
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI!

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    return NextResponse.json({ error: "Token exchange failed", details: text }, { status: 500 })
  }

  const data = await response.json()

  writeTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  })

  return new NextResponse(
    `<!DOCTYPE html>
<html>
<head><title>Spotify Connected</title></head>
<body style="font-family:monospace;background:#0a0a0a;color:#1DB954;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
  <div style="text-align:center">
    <p style="font-size:2rem">✓</p>
    <p>Spotify connected successfully!</p>
    <p style="color:#666;font-size:0.75rem">You can close this tab.</p>
  </div>
</body>
</html>`,
    { headers: { "Content-Type": "text/html" } }
  )
}
