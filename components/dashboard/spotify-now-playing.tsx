"use client"

import { useState, useEffect } from "react"
import { Music2 } from "lucide-react"

interface NowPlaying {
  isPlaying: boolean
  title: string
  artist: string
  album: string
  albumArt: string | null
  duration: number
  progress: number | null
}

type Status = "loading" | "connected" | "not_connected" | "error"

export function SpotifyNowPlaying() {
  const [track, setTrack] = useState<NowPlaying | null>(null)
  const [status, setStatus] = useState<Status>("loading")

  useEffect(() => {
    async function fetchNowPlaying() {
      try {
        const res = await fetch("/api/spotify/now-playing")
        if (res.status === 401) {
          setStatus("not_connected")
          setTrack(null)
          return
        }
        if (res.status === 404) {
          setStatus("connected")
          setTrack(null)
          return
        }
        if (!res.ok) {
          setStatus("error")
          return
        }
        const data = await res.json()
        setTrack(data)
        setStatus("connected")
      } catch {
        setStatus("error")
      }
    }

    fetchNowPlaying()
    const interval = setInterval(fetchNowPlaying, 30_000)
    return () => clearInterval(interval)
  }, [])

  // Not connected — show a subtle link to authenticate
  if (status === "not_connected") {
    return (
      <a
        href="/api/spotify/login"
        className="flex items-center gap-2 rounded-full border border-glass-border bg-glass/60 backdrop-blur-xl px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Music2 className="w-3.5 h-3.5" style={{ color: "#1DB954" }} />
        <span>Connect Spotify</span>
      </a>
    )
  }

  // Still loading or no track available — render nothing
  if (!track) return null

  const progressPct =
    track.duration > 0 && track.progress !== null
      ? Math.min((track.progress / track.duration) * 100, 100)
      : 0

  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-glass-border bg-glass/60 backdrop-blur-xl px-3 py-2 w-[260px]">
      <div className="flex items-center gap-2.5">
        {/* Album art */}
        <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-secondary flex-shrink-0 border border-glass-border">
          {track.albumArt ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={track.albumArt}
              alt={track.album}
              className="w-full h-full object-cover"
            />
          ) : (
            <Music2 className="absolute inset-0 m-auto w-4 h-4 text-muted-foreground" />
          )}
        </div>

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground truncate leading-tight">
            {track.title}
          </p>
          <p className="text-[10px] text-muted-foreground truncate leading-tight">
            {track.artist}
          </p>
        </div>

        {/* Equalizer bars (playing) or music note (paused/recent) */}
        <div className="flex-shrink-0 flex items-end gap-[2px] h-3">
          {track.isPlaying ? (
            <>
              <span
                className="block w-[3px] rounded-full animate-bounce"
                style={{ height: 10, backgroundColor: "#1DB954", animationDelay: "0ms" }}
              />
              <span
                className="block w-[3px] rounded-full animate-bounce"
                style={{ height: 6, backgroundColor: "#1DB954", animationDelay: "150ms" }}
              />
              <span
                className="block w-[3px] rounded-full animate-bounce"
                style={{ height: 12, backgroundColor: "#1DB954", animationDelay: "300ms" }}
              />
            </>
          ) : (
            <Music2 className="w-3 h-3 text-muted-foreground/50" />
          )}
        </div>
      </div>

      {/* Progress bar — only when currently playing */}
      {track.isPlaying && (
        <div className="h-[2px] rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${progressPct}%`, backgroundColor: "#1DB954" }}
          />
        </div>
      )}

      {/* Status label */}
      <p className="text-[9px] text-muted-foreground/50 -mt-0.5 flex items-center gap-1">
        <span style={{ color: "#1DB954" }}>●</span>
        {track.isPlaying ? "Now Playing on Spotify" : "Last Played on Spotify"}
      </p>
    </div>
  )
}
