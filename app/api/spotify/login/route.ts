import { NextRequest, NextResponse } from "next/server"

const SCOPES = [
  "user-read-currently-playing",
  "user-read-recently-played",
].join(" ")

export function GET(req: NextRequest) {
  const clientId = process.env.SPOTIFY_CLIENT_ID

  if (!clientId) {
    return NextResponse.json(
      { error: "SPOTIFY_CLIENT_ID not set in .env" },
      { status: 500 }
    )
  }

  // Derive redirect URI from the incoming request so it works both locally and on Vercel
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
