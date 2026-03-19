"use client"

import { useState, useEffect } from "react"
import { Cloud, CloudRain, CloudSnow, Sun, CloudSun, CloudFog } from "lucide-react"

const weatherIcons = {
  clear: Sun,
  partlyCloudy: CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  rain: CloudRain,
  snow: CloudSnow,
}

interface WeatherData {
  weatherCode: number
  temperature: number
  location: string
}

interface ForecastDay {
  date: string
  weatherCode: number
  tempMax: number
  tempMin: number
}

function getWeatherKind(code: number): keyof typeof weatherIcons {
  if (code === 0) return "clear"
  if ([1, 2].includes(code)) return "partlyCloudy"
  if ([3].includes(code)) return "cloudy"
  if ([45, 48].includes(code)) return "fog"
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow"
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) return "rain"
  return "cloudy"
}

export function WeatherTime() {
  const [mounted, setMounted] = useState(false)
  const [time, setTime] = useState<Date>(new Date())
  const [weather, setWeather] = useState<WeatherData>({
    weatherCode: 3,
    temperature: 12,
    location: "Zurich",
  })
  const [forecast, setForecast] = useState<ForecastDay[]>([])

  useEffect(() => {
    setMounted(true)
    setTime(new Date())
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadWeather() {
      try {
        const response = await fetch("/api/weather")
        const data = await response.json()
        if (cancelled) return

        setWeather({
          weatherCode: Number(data?.current?.weatherCode ?? 3),
          temperature: Number(data?.current?.temperature ?? 12),
          location: String(data?.location || "Zurich"),
        })
        setForecast(Array.isArray(data?.forecast) ? data.forecast : [])
      } catch (error) {
        console.error("Failed to load weather:", error)
      }
    }

    loadWeather()
    const refresh = setInterval(loadWeather, 30 * 60 * 1000)

    return () => {
      cancelled = true
      clearInterval(refresh)
    }
  }, [])

  const WeatherIcon = weatherIcons[getWeatherKind(weather.weatherCode)]

  const formattedTime = mounted
    ? time.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    : "--:--:--"

  const formattedDate = mounted
    ? time.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    : ""

  return (
    <div className="flex flex-col items-center gap-2">
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
        <div className="mt-1 flex items-center gap-2 text-primary">
          <WeatherIcon className="w-4 h-4" />
          <span className="text-sm font-medium">{weather.temperature}&deg;C</span>
          <span className="text-xs text-muted-foreground">{weather.location}</span>
        </div>
      )}
      {mounted && forecast.length > 0 && (
        <div className="mt-1 grid grid-cols-5 gap-1.5 rounded-2xl border border-glass-border bg-glass/60 px-2 py-2 backdrop-blur-xl">
          {forecast.map((day) => {
            const DayIcon = weatherIcons[getWeatherKind(day.weatherCode)]
            return (
              <div key={day.date} className="flex min-w-[52px] flex-col items-center gap-1 rounded-xl px-1 py-1">
                <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {new Date(day.date).toLocaleDateString("en-US", { weekday: "short" })}
                </span>
                <DayIcon className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-medium text-foreground">{Math.round(day.tempMax)}&deg;</span>
                <span className="text-[9px] text-muted-foreground">{Math.round(day.tempMin)}&deg;</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
