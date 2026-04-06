"use client"

import { ArrowLeft, Cpu, WifiOff } from "lucide-react"
import { GlassCard } from "@/components/dashboard/glass-card"
import { AvatarDisplay } from "@/components/dashboard/avatar-display"
import { ChatPanel } from "@/components/dashboard/chat-panel"
import type { Screen } from "@/lib/navigation"

interface OfflineAIScreenProps {
  onNavigate: (screen: Screen) => void
}

export function OfflineAIScreen({ onNavigate }: OfflineAIScreenProps) {
  return (
    <div className="relative w-full h-full">
      {/* Back button */}
      <GlassCard
        position="bottom-right"
        onClick={() => onNavigate("home")}
      >
        <ArrowLeft className="w-5 h-5 text-primary" />
        <span className="text-xs font-medium text-foreground">Back</span>
      </GlassCard>

      {/* Status badge */}
      <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full border border-glass-border bg-glass backdrop-blur-xl px-3 py-1.5">
        <WifiOff className="w-3.5 h-3.5 text-accent" />
        <span className="text-[10px] font-medium text-accent">Offline Mode</span>
        <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">Local Server</span>
      </div>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <h2 className="text-lg font-semibold text-foreground mb-2">Offline AI</h2>
        <p className="text-xs text-muted-foreground mb-4 max-w-xs text-center">
          Powered by your local server. No cloud dependency. Ask anything.
        </p>

        {/* Avatar */}
        <div className="pointer-events-auto mb-4">
          <AvatarDisplay />
        </div>

        {/* Chat panel */}
        <div className="pointer-events-auto w-full max-w-md">
          <div className="mx-4 rounded-xl border border-glass-border bg-glass backdrop-blur-xl overflow-hidden">
            <ChatPanel
              placeholder="Ask your local AI..."
              aiEndpoint="/api/offline-ai"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
