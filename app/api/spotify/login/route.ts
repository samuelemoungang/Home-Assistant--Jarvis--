import { NextRequest, NextResponse } from "next/server"

const SCOPES = [
  "user-read-currently-playing",
  "user-read-recently-played",
  "user-read-playback-state",
  "user-top-read",
].join(" ")

export function GET(req: NextRequest) {
  const clientId = process.env.SPOTIFY_CLIENT_ID

  if (!clientId) {
    return NextResponse.json({ error: "SPOTIFY_CLIENT_ID not set in .env" }, { status: 500 })
  }

  // Derived from request so it works on localhost AND Vercel without any env change
  const redirectUri = `${req.nextUrl.origin}/api/spotify/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SCOPES,
  })

  return NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params.toString()}`
  )
}
