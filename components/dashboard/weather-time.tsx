"use client"

import { useState, useEffect } from "react"
import { Cloud, Sun, CloudRain, Snowflake } from "lucide-react"

const weatherIcons = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  snowy: Snowflake,
}

interface WeatherData {
  condition: keyof typeof weatherIcons
  temperature: number
  location: string
}

export function WeatherTime() {
  const [mounted, setMounted] = useState(false)
  const [time, setTime] = useState<Date>(new Date())
  const [weather] = useState<WeatherData>({
    condition: "cloudy",
    temperature: 12,
    location: "Zurich",
  })

  useEffect(() => {
    setMounted(true)
    setTime(new Date())
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const WeatherIcon = weatherIcons[weather.condition]

  const formattedTime = mounted
    ? time.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "--:--"

  const formattedDate = mounted
    ? time.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    : ""

  return (
    <div className="flex flex-col items-center gap-1">
      <span
        suppressHydrationWarning
        className="text-4xl font-light tracking-wider text-foreground font-mono tabular-nums"
      >
        {formattedTime}
      </span>
      <span suppressHydrationWarning className="text-sm text-muted-foreground">
        {formattedDate || "\u00A0"}
      </span>
      {mounted && (
        <div className="flex items-center gap-2 mt-1 text-primary">
          <WeatherIcon className="w-4 h-4" />
          <span className="text-sm font-medium">{weather.temperature}&deg;C</span>
          <span className="text-xs text-muted-foreground">{weather.location}</span>
        </div>
      )}
    </div>
  )
}
