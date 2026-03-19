"use client"

import { cn } from "@/lib/utils"

interface AvatarDisplayProps {
  className?: string
}

export function AvatarDisplay({ className }: AvatarDisplayProps) {
  return (
    <div className={cn("relative flex items-center justify-center pointer-events-none", className)}>
      <div className="absolute h-56 w-56 rounded-full bg-primary/12 blur-3xl md:h-72 md:w-72" />
      <div className="absolute h-40 w-[22rem] bg-gradient-to-r from-transparent via-primary/12 to-transparent blur-2xl md:w-[30rem]" />

      <div className="relative flex flex-col items-center gap-3">
        <div className="rounded-2xl border border-primary/20 bg-background/25 px-5 py-4 shadow-[0_0_40px_rgba(0,220,255,0.12)] backdrop-blur-xl md:px-8 md:py-5">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_12px_rgba(0,220,255,0.7)]" />
            <span className="font-mono text-[11px] uppercase tracking-[0.45em] text-primary/80 md:text-xs">
              System Core
            </span>
          </div>

          <div className="mt-3 flex items-end justify-center gap-2">
            <span className="font-mono text-4xl font-semibold tracking-[0.18em] text-foreground drop-shadow-[0_0_18px_rgba(255,255,255,0.08)] md:text-6xl">
              PrinceLab
            </span>
          </div>

          <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground md:text-[11px]">
            Neural Dashboard Interface
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.35em] text-primary/70">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span>Online</span>
          <span className="text-muted-foreground/70">Core Ready</span>
        </div>
      </div>
    </div>
  )
}
