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

  type SpotifyArtist = { id: string; name: string; images: { url: string }[]; genres?: string[] }
  type SpotifyTrack = { artists: { id: string }[] }

  // Fetch top artists (short_term) + top tracks (medium_term) in parallel
  const [artistRes, trackRes] = await Promise.all([
    fetch("https://api.spotify.com/v1/me/top/artists?limit=5&time_range=short_term", {
      headers: { Authorization: `Bearer ${access_token}` },
    }),
    fetch("https://api.spotify.com/v1/me/top/tracks?limit=30&time_range=medium_term", {
      headers: { Authorization: `Bearer ${access_token}` },
    }),
  ])

  if (!artistRes.ok) {
    const err = await artistRes.json().catch(() => ({}))
    return NextResponse.json({ error: "spotify_error", details: err }, { status: 502 })
  }

  const [artistData, trackData] = await Promise.all([
    artistRes.json(),
    trackRes.ok ? trackRes.json() : Promise.resolve({ items: [] }),
  ])

  const topArtists = ((artistData.items ?? []) as SpotifyArtist[])
    .slice(0, 5)
    .map((a) => ({
      name: a.name,
      image: a.images?.[1]?.url ?? a.images?.[0]?.url ?? null,
    }))

  // Collect unique artist IDs from top tracks to widen genre coverage
  const trackArtistIds = [
    ...new Set(
      ((trackData.items ?? []) as SpotifyTrack[])
        .flatMap((t) => t.artists.map((a) => a.id))
    ),
  ].slice(0, 50) // Spotify batch limit

  // Fetch full artist objects (includes genres) for all track artists
  const genreCount: Record<string, number> = {}

  if (trackArtistIds.length > 0) {
    const fullArtistRes = await fetch(
      `https://api.spotify.com/v1/artists?ids=${trackArtistIds.join(",")}`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    )
    if (fullArtistRes.ok) {
      const fullArtistData = await fullArtistRes.json()
      for (const artist of (fullArtistData.artists ?? []) as SpotifyArtist[]) {
        for (const genre of (artist.genres ?? [])) {
          genreCount[genre] = (genreCount[genre] ?? 0) + 1
        }
      }
    }
  }

  // Also include genres from top artists directly
  for (const artist of (artistData.items ?? []) as SpotifyArtist[]) {
    for (const genre of (artist.genres ?? [])) {
      genreCount[genre] = (genreCount[genre] ?? 0) + 2 // weight top artists higher
    }
  }

  const topGenres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre]) => genre)

  return NextResponse.json({ topGenres, topArtists })
}
