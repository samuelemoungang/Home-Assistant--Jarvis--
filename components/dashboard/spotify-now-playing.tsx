"use client"

import { useState, useEffect } from "react"
import { Music2, Smartphone, Monitor, Speaker, Tv, Tablet, Loader2, BarChart2, ChevronUp } from "lucide-react"

interface NowPlaying {
  isPlaying: boolean
  title: string
  artist: string
  album: string
  albumArt: string | null
  duration: number
  progress: number | null
  device: { name: string; type: string } | null
}

interface TopStats {
  topGenres: string[]
  topArtists: { name: string; image: string | null }[]
}

type Status = "loading" | "connected" | "not_connected" | "error"

function DeviceIcon({ type, className }: { type: string; className?: string }) {
  const t = type.toLowerCase()
  if (t.includes("smartphone") || t.includes("phone")) return <Smartphone className={className} />
  if (t.includes("computer") || t.includes("laptop")) return <Monitor className={className} />
  if (t.includes("speaker") || t.includes("audio")) return <Speaker className={className} />
  if (t.includes("tv") || t.includes("cast")) return <Tv className={className} />
  if (t.includes("tablet")) return <Tablet className={className} />
  return <Music2 className={className} />
}

export function SpotifyNowPlaying() {
  const [track, setTrack] = useState<NowPlaying | null>(null)
  const [status, setStatus] = useState<Status>("loading")
  const [stats, setStats] = useState<TopStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [showStats, setShowStats] = useState(false)

  useEffect(() => {
    async function fetchNowPlaying() {
      try {
        const res = await fetch("/api/spotify/now-playing")
        if (res.status === 401) { setStatus("not_connected"); setTrack(null); return }
        if (res.status === 404) { setStatus("connected"); setTrack(null); return }
        if (!res.ok) { setStatus("error"); return }
        setTrack(await res.json())
        setStatus("connected")
      } catch {
        setStatus("error")
      }
    }
    fetchNowPlaying()
    const id = setInterval(fetchNowPlaying, 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    async function fetchStats() {
      setStatsLoading(true)
      try {
        const res = await fetch("/api/spotify/top-genres")
        if (res.ok) setStats(await res.json())
      } catch { /* ignore */ } finally {
        setStatsLoading(false)
      }
    }
    fetchStats()
    const id = setInterval(fetchStats, 5 * 60_000)
    return () => clearInterval(id)
  }, [])

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

  if (!track) return null

  const progressPct =
    track.duration > 0 && track.progress !== null
      ? Math.min((track.progress / track.duration) * 100, 100)
      : 0

  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-glass-border bg-glass/60 backdrop-blur-xl px-3 py-2 w-[270px]">

      {/* Track row */}
      <div className="flex items-center gap-2.5">
        <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-secondary flex-shrink-0 border border-glass-border">
          {track.albumArt ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={track.albumArt} alt={track.album} className="w-full h-full object-cover" />
          ) : (
            <Music2 className="absolute inset-0 m-auto w-4 h-4 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground truncate leading-tight">{track.title}</p>
          <p className="text-[10px] text-muted-foreground truncate leading-tight">{track.artist}</p>
        </div>

        <div className="flex-shrink-0 flex items-end gap-[2px] h-3">
          {track.isPlaying ? (
            <>
              <span className="block w-[3px] rounded-full animate-bounce" style={{ height: 10, backgroundColor: "#1DB954", animationDelay: "0ms" }} />
              <span className="block w-[3px] rounded-full animate-bounce" style={{ height: 6, backgroundColor: "#1DB954", animationDelay: "150ms" }} />
              <span className="block w-[3px] rounded-full animate-bounce" style={{ height: 12, backgroundColor: "#1DB954", animationDelay: "300ms" }} />
            </>
          ) : (
            <Music2 className="w-3 h-3 text-muted-foreground/50" />
          )}
        </div>
      </div>

      {/* Progress bar */}
      {track.isPlaying && (
        <div className="h-[2px] rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${progressPct}%`, backgroundColor: "#1DB954" }}
          />
        </div>
      )}

      {/* Device + stats button row */}
      <div className="flex items-center gap-1.5 border-t border-glass-border/50 pt-1.5">
        {track.device && (
          <>
            <DeviceIcon type={track.device.type} className="w-3 h-3 text-muted-foreground/60 flex-shrink-0" />
            <span className="text-[10px] text-muted-foreground/70 truncate">{track.device.name}</span>
          </>
        )}
        <button
          type="button"
          onClick={() => setShowStats((v) => !v)}
          className="ml-auto flex items-center gap-1 rounded-full border border-glass-border bg-secondary/50 px-2 py-0.5 text-[9px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
        >
          {showStats
            ? <><ChevronUp className="w-2.5 h-2.5" /> Close</>
            : <><BarChart2 className="w-2.5 h-2.5" /> Stats</>
          }
        </button>
      </div>

      {/* Status label */}
      <p className="text-[9px] text-muted-foreground/50 flex items-center gap-1">
        <span style={{ color: "#1DB954" }}>●</span>
        {track.isPlaying ? "Now Playing on Spotify" : "Last Played on Spotify"}
      </p>

      {/* Stats panel */}
      {showStats && (
        <div className="border-t border-glass-border/50 pt-2 flex flex-col gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
          {statsLoading || !stats ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground/50" />
            </div>
          ) : (
            <>
              {/* Top genres */}
              <div>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground/50 mb-1.5">
                  Top genres
                </p>
                <div className="flex flex-wrap gap-1">
                  {stats.topGenres.map((genre, i) => (
                    <span
                      key={genre}
                      className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium capitalize border border-glass-border bg-secondary/60 text-muted-foreground"
                    >
                      <span className="text-[8px] text-muted-foreground/40">#{i + 1}</span>
                      {genre}
                    </span>
                  ))}
                </div>
              </div>

              <div className="h-px bg-glass-border/50" />

              {/* Top artists */}
              <div>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground/50 mb-1.5">
                  Top artists · last 30 days
                </p>
                <div className="flex flex-col gap-1.5">
                  {stats.topArtists.map((artist, i) => (
                    <div key={artist.name} className="flex items-center gap-2">
                      <span className="text-[9px] text-muted-foreground/40 w-3 text-right flex-shrink-0">
                        {i + 1}
                      </span>
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-secondary flex-shrink-0 border border-glass-border">
                        {artist.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" />
                        ) : (
                          <Music2 className="w-3 h-3 m-auto mt-1.5 text-muted-foreground/40" />
                        )}
                      </div>
                      <span className="text-[11px] text-foreground truncate">{artist.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
