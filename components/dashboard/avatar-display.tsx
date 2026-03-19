"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface AvatarDisplayProps {
  speaking?: boolean
  className?: string
}

export function AvatarDisplay({ speaking = false, className }: AvatarDisplayProps) {
  const [pulse, setPulse] = useState(false)
  const neuralNodes = [
    { id: 1, x: 28, y: 36, delay: "0s" },
    { id: 2, x: 56, y: 22, delay: "0.6s" },
    { id: 3, x: 88, y: 30, delay: "1.1s" },
    { id: 4, x: 100, y: 62, delay: "0.3s" },
    { id: 5, x: 92, y: 92, delay: "1.6s" },
    { id: 6, x: 62, y: 108, delay: "0.8s" },
    { id: 7, x: 34, y: 96, delay: "1.3s" },
    { id: 8, x: 22, y: 66, delay: "0.2s" },
  ]

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
      <div
        className={cn(
          "absolute rounded-full border border-primary/30 transition-all duration-500",
          speaking ? "h-72 w-72 animate-ping opacity-20" : "h-64 w-64 opacity-20"
        )}
      />
      <div
        className="absolute h-[31rem] w-[31rem] rounded-full border border-primary/10"
        style={{ animation: "jarvis-spin-slow 42s linear infinite" }}
      />
      <div
        className="absolute h-[25rem] w-[25rem] rounded-full border border-primary/20"
        style={{ animation: "jarvis-spin-reverse 30s linear infinite" }}
      />
      <div
        className="absolute h-[19rem] w-[19rem] rounded-full border border-primary/20"
        style={{ animation: "jarvis-spin-slow 22s linear infinite" }}
      />

      <svg
        viewBox="0 0 120 120"
        className={cn(
          "absolute h-[26rem] w-[26rem] text-primary/70 transition-transform duration-700",
          speaking ? "scale-105" : "scale-100"
        )}
        style={{ animation: "jarvis-spin-slow 36s linear infinite" }}
      >
        <defs>
          <linearGradient id="neuroGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="52" fill="none" stroke="url(#neuroGlow)" strokeOpacity="0.22" strokeWidth="0.8" />
        <circle cx="60" cy="60" r="42" fill="none" stroke="url(#neuroGlow)" strokeOpacity="0.2" strokeWidth="0.8" strokeDasharray="2 3" />
        <path d="M28 36L56 22L88 30L100 62L92 92L62 108L34 96L22 66Z" fill="none" stroke="url(#neuroGlow)" strokeOpacity="0.45" strokeWidth="1.2" />
        <path d="M28 36L92 92M56 22L62 108M88 30L34 96M22 66L100 62" fill="none" stroke="url(#neuroGlow)" strokeOpacity="0.25" strokeWidth="1" />
        {neuralNodes.map((node) => (
          <g key={node.id} style={{ animationDelay: node.delay }}>
            <circle cx={node.x} cy={node.y} r="2.5" fill="var(--primary)" className="animate-pulse" />
            <circle cx={node.x} cy={node.y} r="5.5" fill="none" stroke="var(--primary)" strokeOpacity="0.35" strokeWidth="0.8" />
          </g>
        ))}
      </svg>

      <div className="absolute h-8 w-8 rounded-full bg-primary/30 blur-md" />
      <div
        className="absolute h-2 w-52 bg-gradient-to-r from-transparent via-primary/50 to-transparent blur-sm"
        style={{ animation: "jarvis-spin-reverse 18s linear infinite" }}
      />

      <div className="relative h-72 w-72 overflow-hidden rounded-full border-2 border-primary/40 shadow-[0_0_65px_var(--glow)]">
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

      <div className="absolute bottom-0 rounded-full border border-primary/20 bg-background/60 px-4 py-1.5 text-[10px] uppercase tracking-[0.34em] text-primary/80 backdrop-blur-xl">
        Neural Core
      </div>
    </div>
  )
}
