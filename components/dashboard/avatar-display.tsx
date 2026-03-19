"use client"

import { cn } from "@/lib/utils"

interface AvatarDisplayProps {
  className?: string
}

export function AvatarDisplay({ className }: AvatarDisplayProps) {
  return (
    <div className={cn("relative flex items-center justify-center pointer-events-none", className)}>
      <div className="relative aspect-video w-[92vw] max-w-[1040px] md:w-[72vw]">
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-88 mix-blend-screen"
          src="/videos/jarvis-core.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-58 mix-blend-screen"
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
