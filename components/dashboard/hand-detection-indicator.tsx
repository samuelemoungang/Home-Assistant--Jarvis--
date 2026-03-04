"use client"

import { Hand } from "lucide-react"
import { usePiStats } from "@/hooks/use-pi-stats"

export function HandDetectionIndicator() {
  const { stats, connected } = usePiStats(3000)

  if (!connected) return null

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 rounded-full border border-glass-border bg-glass backdrop-blur-xl px-2.5 py-1 pointer-events-none">
      <Hand
        className={`w-3 h-3 transition-colors ${
          stats?.hand_detected ? "text-primary" : "text-muted-foreground/40"
        }`}
      />
      {stats?.hand_detected && (
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
      )}
    </div>
  )
}
