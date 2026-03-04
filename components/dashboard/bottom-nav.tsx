"use client"

import { DollarSign, Bot, LogOut } from "lucide-react"
import type { Screen } from "@/lib/navigation"

interface BottomNavProps {
  onNavigate: (screen: Screen) => void
  onExit: () => void
}

export function BottomNav({ onNavigate, onExit }: BottomNavProps) {
  const items = [
    { icon: DollarSign, label: "Finance", action: () => onNavigate("finance") },
    { icon: Bot, label: "AI", action: () => onNavigate("offline-ai") },
    { icon: LogOut, label: "Exit", action: onExit },
  ]

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 rounded-full border border-glass-border bg-glass backdrop-blur-xl px-2 py-1.5">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.label}
            type="button"
            onClick={item.action}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 active:scale-95 transition-transform cursor-pointer hover:bg-secondary/50"
            aria-label={item.label}
          >
            <Icon className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-medium text-foreground">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
