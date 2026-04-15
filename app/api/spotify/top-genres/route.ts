import { NextResponse } from "next/server"
import { readTokens, writeTokens } from "@/lib/spotify-token-store"

async function refreshAccessToken(refreshToken: string) {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  })
  return response.json()
}

export async function GET() {
  const tokens = await readTokens()
  if (!tokens) return NextResponse.json({ error: "not_connected" }, { status: 401 })

  let { access_token } = tokens
  if (Date.now() > tokens.expires_at - 60_000) {
    try {
      const refreshed = await refreshAccessToken(tokens.refresh_token)
      if (!refreshed.access_token) return NextResponse.json({ error: "not_connected" }, { status: 401 })
      access_token = refreshed.access_token
      await writeTokens({
        access_token,
        refresh_token: refreshed.refresh_token ?? tokens.refresh_token,
        expires_at: Date.now() + refreshed.expires_in * 1000,
      })
    } catch {
      return NextResponse.json({ error: "not_connected" }, { status: 401 })
    }
  }

  // Fetch top genres and top artists in parallel
  const [genreRes, artistRes] = await Promise.all([
    fetch("https://api.spotify.com/v1/me/top/artists?limit=20&time_range=medium_term", {
      headers: { Authorization: `Bearer ${access_token}` },
    }),
    fetch("https://api.spotify.com/v1/me/top/artists?limit=5&time_range=short_term", {
      headers: { Authorization: `Bearer ${access_token}` },
    }),
  ])

  // Surface the real Spotify error instead of a generic 500
  if (!genreRes.ok) {
    const err = await genreRes.json().catch(() => ({}))
    return NextResponse.json({ error: "spotify_error", details: err, status: genreRes.status }, { status: 502 })
  }
  if (!artistRes.ok) {
    const err = await artistRes.json().catch(() => ({}))
    return NextResponse.json({ error: "spotify_error", details: err, status: artistRes.status }, { status: 502 })
  }

  const [genreData, artistData] = await Promise.all([genreRes.json(), artistRes.json()])

  // Aggregate genres from top 20 artists
  const genreCount: Record<string, number> = {}
  for (const artist of (genreData.items ?? []) as { genres: string[] }[]) {
    for (const genre of artist.genres) {
      genreCount[genre] = (genreCount[genre] ?? 0) + 1
    }
  }
  const topGenres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre]) => genre)

  const topArtists = ((artistData.items ?? []) as { name: string; images: { url: string }[] }[])
    .slice(0, 5)
    .map((a) => ({
      name: a.name,
      image: a.images?.[1]?.url ?? a.images?.[0]?.url ?? null,
    }))

  return NextResponse.json({ topGenres, topArtists })
}
