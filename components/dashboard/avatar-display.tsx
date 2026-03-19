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
      <div className="relative h-[24rem] w-[24rem]">
        <video
          className="absolute inset-0 h-full w-full object-contain"
          src="/videos/jarvis-core.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        <video
          className="absolute inset-0 h-full w-full object-contain opacity-72"
          src="/videos/jarvis-neural.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
      </div>
    </div>
  )
}
