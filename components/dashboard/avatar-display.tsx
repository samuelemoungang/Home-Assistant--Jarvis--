"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface AvatarDisplayProps {
  speaking?: boolean
  className?: string
}

export function AvatarDisplay({ speaking = false, className }: AvatarDisplayProps) {
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    if (speaking) {
      const interval = setInterval(() => setPulse((p) => !p), 500)
      return () => clearInterval(interval)
    }
    setPulse(false)
  }, [speaking])

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <div className="absolute h-[34rem] w-[34rem] overflow-hidden rounded-full opacity-45 blur-3xl">
        <video
          className="absolute inset-0 h-full w-full scale-125 object-cover mix-blend-screen"
          src="/videos/jarvis-core.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        <video
          className="absolute inset-0 h-full w-full scale-125 object-cover opacity-70 mix-blend-screen"
          src="/videos/jarvis-neural.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(3,10,16,0.15)_58%,rgba(3,10,16,0.9)_100%)]" />
      </div>

      <div className="absolute h-[28rem] w-[28rem] overflow-hidden rounded-full opacity-55 blur-2xl">
        <video
          className="absolute inset-0 h-full w-full object-cover mix-blend-screen scale-150"
          src="/videos/jarvis-core.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-65 mix-blend-screen scale-150"
          src="/videos/jarvis-neural.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
      </div>

      <div
        className={cn(
          "absolute rounded-full bg-primary/20 blur-2xl transition-all duration-700",
          speaking ? "h-72 w-72 opacity-80" : "h-64 w-64 opacity-45",
          pulse && "scale-110"
        )}
      />

      <div className="relative h-72 w-72 overflow-hidden rounded-full">
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-88 mix-blend-screen scale-110"
          src="/videos/jarvis-core.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-68 mix-blend-screen scale-110"
          src="/videos/jarvis-neural.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_18%,rgba(4,11,18,0.08)_48%,rgba(4,11,18,0.58)_76%,rgba(4,11,18,0.82)_100%)]" />
      </div>
    </div>
  )
}
