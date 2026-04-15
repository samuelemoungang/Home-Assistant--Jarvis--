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

  const playerRes = await fetch("https://api.spotify.com/v1/me/player", {
    headers: { Authorization: `Bearer ${access_token}` },
  })

  if (playerRes.status === 200) {
    const data = await playerRes.json()
    if (data?.item) {
      return NextResponse.json({
        isPlaying: data.is_playing as boolean,
        title: data.item.name as string,
        artist: (data.item.artists as { name: string }[]).map((a) => a.name).join(", "),
        album: data.item.album.name as string,
        albumArt: (data.item.album.images as { url: string }[])[0]?.url ?? null,
        duration: data.item.duration_ms as number,
        progress: data.progress_ms as number,
        device: data.device ? { name: data.device.name as string, type: data.device.type as string } : null,
      })
    }
  }

  const recentRes = await fetch(
    "https://api.spotify.com/v1/me/player/recently-played?limit=1",
    { headers: { Authorization: `Bearer ${access_token}` } }
  )

  if (recentRes.ok) {
    const data = await recentRes.json()
    const track = data?.items?.[0]?.track
    if (track) {
      return NextResponse.json({
        isPlaying: false,
        title: track.name as string,
        artist: (track.artists as { name: string }[]).map((a) => a.name).join(", "),
        album: track.album.name as string,
        albumArt: (track.album.images as { url: string }[])[0]?.url ?? null,
        duration: track.duration_ms as number,
        progress: null,
        device: null,
      })
    }
  }

  return NextResponse.json({ error: "no_track" }, { status: 404 })
}
