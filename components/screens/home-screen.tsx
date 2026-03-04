"use client"

import { DollarSign, Home, Bot, LogOut } from "lucide-react"
import { GlassCard } from "@/components/dashboard/glass-card"
import { AvatarDisplay } from "@/components/dashboard/avatar-display"
import { ChatPanel } from "@/components/dashboard/chat-panel"
import { useFinance } from "@/lib/finance-context"
import { useState } from "react"
import dynamic from "next/dynamic"
import type { Screen } from "@/lib/navigation"

const WeatherTime = dynamic(
  () => import("@/components/dashboard/weather-time").then((mod) => mod.WeatherTime),
  { ssr: false, loading: () => <div className="h-[72px]" /> }
)

interface HomeScreenProps {
  onNavigate: (screen: Screen) => void
}

const cornerIcons = {
  "top-left": DollarSign,
  "top-right": Home,
  "bottom-left": Bot,
  "bottom-right": LogOut,
}

const cornerConfig = {
  "top-left": { label: "Finance", target: "finance" as Screen },
  "top-right": { label: "Home", target: "home" as Screen },
  "bottom-left": { label: "Offline AI", target: "offline-ai" as Screen },
  "bottom-right": { label: "Exit", target: null as Screen | null },
}

function exitDashboard() {
  // In Chromium kiosk mode, window.close() exits to the desktop
  window.close()
  // Fallback: if window.close() is blocked, navigate to about:blank
  setTimeout(() => {
    window.location.href = "about:blank"
  }, 300)
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const { refreshAll, isConnected } = useFinance()

  return (
    <div className="relative w-full h-full">
      {/* Corner cards */}
      {(Object.keys(cornerConfig) as Array<keyof typeof cornerConfig>).map((position) => {
        const config = cornerConfig[position]
        const Icon = cornerIcons[position]
        return (
          <GlassCard
            key={position}
            position={position}
            onClick={() => {
              if (config.target) {
                onNavigate(config.target)
              } else {
                setShowExitConfirm(true)
              }
            }}
          >
            <Icon className="w-5 h-5 text-primary" />
            <span className="text-xs font-medium text-foreground">{config.label}</span>
          </GlassCard>
        )
      })}

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {/* Weather and Time */}
        <div className="pointer-events-auto mb-4">
          <WeatherTime />
        </div>

        {/* Avatar */}
        <div className="pointer-events-auto mb-4">
          <AvatarDisplay speaking={isSpeaking} />
        </div>

        {/* Chat panel */}
        <div className="pointer-events-auto w-full max-w-md">
          <div className="mx-4 rounded-xl border border-glass-border bg-glass backdrop-blur-xl overflow-hidden">
            <ChatPanel
              compact
              onSpeakingChange={setIsSpeaking}
              placeholder={isConnected ? "Tell me about your spending..." : "Ask your Pi Assistant..."}
              useFinanceAI={isConnected}
              onTransactionAdded={refreshAll}
            />
          </div>
        </div>
      </div>

      {/* Exit confirmation overlay */}
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
