"use client"

import { Cpu, Thermometer, Droplets, Camera, X, LogOut } from "lucide-react"
import { AvatarDisplay } from "@/components/dashboard/avatar-display"
import { ChatPanel } from "@/components/dashboard/chat-panel"
import { BottomNav } from "@/components/dashboard/bottom-nav"
import { useFinance } from "@/lib/finance-context"
import { usePiStats } from "@/hooks/use-pi-stats"
import { useState, useRef, useCallback } from "react"
import dynamic from "next/dynamic"
import type { Screen } from "@/lib/navigation"

const WeatherTime = dynamic(
  () => import("@/components/dashboard/weather-time").then((mod) => mod.WeatherTime),
  { ssr: false, loading: () => <div className="h-[72px]" /> }
)

const SpotifyNowPlaying = dynamic(
  () => import("@/components/dashboard/spotify-now-playing").then((mod) => mod.SpotifyNowPlaying),
  { ssr: false }
)

interface HomeScreenProps {
  onNavigate: (screen: Screen) => void
  onCameraToggle?: (active: boolean) => void
}

type ExpandedCard = "pi-stats" | "temperature" | "humidity" | "camera" | null

function exitDashboard() {
  window.close()
  setTimeout(() => {
    window.location.href = "about:blank"
  }, 300)
}

export function HomeScreen({ onNavigate, onCameraToggle }: HomeScreenProps) {
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [expanded, setExpanded] = useState<ExpandedCard>(null)
  const { refreshAll } = useFinance()

  // Notify parent when camera is expanded/collapsed
  const handleSetExpanded = useCallback((card: ExpandedCard) => {
    setExpanded(card)
    if (onCameraToggle) {
      onCameraToggle(card === "camera")
    }
  }, [onCameraToggle])
  const { stats, sensors, connected, source, cameraSnapshot, error } = usePiStats()
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPress = useRef(false)

  const handleTouchStart = useCallback((key: ExpandedCard) => {
    didLongPress.current = false
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true
      handleSetExpanded(key)
    }, 500)
  }, [handleSetExpanded])

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const handleTouchCancel = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const infoCards = [
    {
      key: "pi-stats" as const,
      icon: Cpu,
      label: "Pi Status",
      value: connected && stats ? `${stats.cpu_temp.toFixed(0)}°C` : "--",
      sub:
        connected && stats
          ? source === "remote"
            ? `Remote sync - RAM ${stats.ram_percent.toFixed(0)}%`
            : `RAM ${stats.ram_percent.toFixed(0)}%`
          : error?.kind === "config"
            ? "Remote Config"
            : "Offline",
      color: connected ? (stats && stats.cpu_temp > 70 ? "text-destructive" : "text-primary") : "text-muted-foreground",
    },
    {
      key: "temperature" as const,
      icon: Thermometer,
      label: "Temperature",
      value: sensors.temperature !== null ? `${sensors.temperature.toFixed(1)}°C` : "--°C",
      sub: sensors.temperature !== null ? "Sensor Active" : "No Sensor",
      color: sensors.temperature !== null ? "text-accent" : "text-muted-foreground",
    },
    {
      key: "humidity" as const,
      icon: Droplets,
      label: "Humidity",
      value: sensors.humidity !== null ? `${sensors.humidity.toFixed(0)}%` : "--%",
      sub: sensors.humidity !== null ? "Sensor Active" : "No Sensor",
      color: sensors.humidity !== null ? "text-chart-3" : "text-muted-foreground",
    },
    {
      key: "camera" as const,
      icon: Camera,
      label: "Camera",
      value: "IMX500",
      sub:
        source === "local"
          ? "Live Stream"
          : source === "remote"
            ? "Cloud Snapshot"
            : error?.kind === "config"
              ? "Remote Config"
              : "Offline",
      color: connected ? "text-chart-2" : "text-muted-foreground",
    },
  ]

  const expandedContent: Record<string, { title: string; content: React.ReactNode }> = {
    "pi-stats": {
      title: "Raspberry Pi Stats",
      content: stats ? (
        <div className="space-y-3">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">CPU Temperature</span>
            <span className={`font-mono ${stats.cpu_temp > 70 ? "text-destructive" : "text-foreground"}`}>
              {stats.cpu_temp.toFixed(1)}°C
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full ${stats.cpu_temp > 70 ? "bg-destructive" : "bg-primary"}`}
              style={{ width: `${Math.min((stats.cpu_temp / 85) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">RAM Usage</span>
            <span className="font-mono text-foreground">
              {stats.ram_used.toFixed(0)} / {stats.ram_total.toFixed(0)} MB ({stats.ram_percent.toFixed(0)}%)
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full bg-accent" style={{ width: `${stats.ram_percent}%` }} />
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Uptime</span>
            <span className="font-mono text-foreground">{stats.uptime}</span>
          </div>
        </div>
      ) : error ? (
        <p className="text-xs text-muted-foreground">{error.message}</p>
      ) : (
        <p className="text-xs text-muted-foreground">Pi service not connected. Start pi-stats-service.py on the Pi or verify the remote Supabase sync.</p>
      ),
    },
    temperature: {
      title: "Temperature Sensor",
      content: sensors.temperature != null ? (
        <div className="flex flex-col items-center gap-3">
          <span className="text-4xl font-light text-accent font-mono">{sensors.temperature.toFixed(1)}°C</span>
          <p className="text-xs text-muted-foreground">Live reading from sensor</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Thermometer className="w-8 h-8 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground text-center">No temperature sensor connected. Connect a DHT22 or DS18B20 sensor to enable readings.</p>
        </div>
      ),
    },
    humidity: {
      title: "Humidity Sensor",
      content: sensors.humidity !== null ? (
        <div className="flex flex-col items-center gap-3">
          <span className="text-4xl font-light text-chart-3 font-mono">{sensors.humidity.toFixed(0)}%</span>
          <p className="text-xs text-muted-foreground">Relative humidity</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Droplets className="w-8 h-8 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground text-center">No humidity sensor connected. Connect a DHT22 sensor to enable readings.</p>
        </div>
      ),
    },
    camera: {
      title: "IMX500 Camera",
      content: (
        <div className="flex flex-col items-center gap-2">
          {connected ? (
            <>
              {source === "local" ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="http://localhost:8081/stream"
                    alt="Camera feed from IMX500"
                    className="w-full rounded-lg border border-border bg-secondary"
                    style={{ maxHeight: 200 }}
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = "none"
                      const p = (e.target as HTMLImageElement).nextElementSibling
                      if (p) (p as HTMLElement).style.display = "block"
                    }}
                  />
                  <p className="text-xs text-muted-foreground hidden">Camera stream unavailable. Start pi-camera-stream.py on the Pi.</p>
                </>
              ) : cameraSnapshot ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cameraSnapshot}
                    alt="Latest Raspberry Pi camera snapshot"
                    className="w-full rounded-lg border border-border bg-secondary object-cover"
                    style={{ maxHeight: 200 }}
                  />
                  <p className="text-xs text-muted-foreground text-center">Remote snapshot updated from Supabase every few seconds.</p>
                </>
              ) : (
                <>
                  <Camera className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground text-center">Remote Pi stats are online, but the latest camera snapshot is missing or too old.</p>
                </>
              )}
            </>
          ) : (
            <>
              <Camera className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground text-center">
                {error?.message ?? "Start pi-camera-stream.py on the Pi to view the MJPEG feed or publish snapshots to Supabase."}
              </p>
            </>
          )}
        </div>
      ),
    },
  }

  return (
    <div className="relative w-full h-full">
      {/* 4 Info Cards in corners */}
      {infoCards.map((card, idx) => {
        const Icon = card.icon
        const positions = [
          "absolute top-3 left-3",
          "absolute top-3 right-3",
          "absolute bottom-14 left-3",
          "absolute bottom-14 right-3",
        ]
        return (
          <button
            key={card.key}
            type="button"
            onTouchStart={() => handleTouchStart(card.key)}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            onMouseDown={() => handleTouchStart(card.key)}
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchCancel}
            className={`${positions[idx]} z-10 flex items-center gap-2.5 rounded-xl border border-glass-border bg-glass backdrop-blur-xl px-3 py-2 select-none cursor-pointer active:scale-95 transition-transform`}
          >
            <Icon className={`w-4 h-4 ${card.color}`} />
            <div className="text-left">
              <p className="text-[10px] text-muted-foreground leading-tight">{card.label}</p>
              <p className={`text-sm font-semibold font-mono leading-tight ${card.color}`}>{card.value}</p>
              <p className="text-[9px] text-muted-foreground/70 leading-tight">{card.sub}</p>
            </div>
          </button>
        )
      })}

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="pointer-events-auto mb-3">
          <SpotifyNowPlaying />
        </div>
        <div className="pointer-events-auto mb-3">
          <WeatherTime />
        </div>
        <div className="pointer-events-auto mb-3">
          <AvatarDisplay />
        </div>
        <div className="pointer-events-auto w-full max-w-md">
          <div className="mx-4 rounded-xl border border-glass-border bg-glass backdrop-blur-xl overflow-hidden">
            <ChatPanel
              compact
              placeholder="Tell me about your spending..."
              useFinanceAI
              onTransactionAdded={refreshAll}
            />
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <BottomNav onNavigate={onNavigate} onExit={() => setShowExitConfirm(true)} />

      {/* Expanded card overlay */}
      {expanded && expandedContent[expanded] && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-background/70 backdrop-blur-sm"
          onClick={() => handleSetExpanded(null)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Escape" && handleSetExpanded(null)}
        >
          <div
            className="rounded-2xl border border-glass-border bg-card/95 backdrop-blur-xl p-6 w-[320px] flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={expandedContent[expanded].title}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">{expandedContent[expanded].title}</h3>
              <button type="button" onClick={() => handleSetExpanded(null)} className="p-1 cursor-pointer" aria-label="Close">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            {expandedContent[expanded].content}
          </div>
        </div>
      )}

      {/* Exit confirmation */}
      {showExitConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="rounded-xl border border-glass-border bg-card p-6 text-center flex flex-col items-center gap-4 w-[280px]">
            <LogOut className="w-8 h-8 text-destructive" />
            <p className="text-foreground font-medium text-sm">Exit the dashboard?</p>
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 rounded-lg border border-border bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground active:scale-95 transition-transform cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={exitDashboard}
                className="flex-1 rounded-lg bg-destructive px-4 py-3 text-sm font-medium text-destructive-foreground active:scale-95 transition-transform cursor-pointer"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
