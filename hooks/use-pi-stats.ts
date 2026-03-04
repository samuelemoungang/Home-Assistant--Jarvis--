"use client"

import { useState, useEffect, useCallback } from "react"

const PI_STATS_URL = "http://localhost:8080"

export interface PiStats {
  cpu_temp: number
  ram_percent: number
  ram_used: number
  ram_total: number
  power_consumption: number | null
  uptime: string
  hand_detected: boolean
}

export interface SensorData {
  temperature: number | null
  humidity: number | null
}

export function usePiStats(intervalMs = 5000) {
  const [stats, setStats] = useState<PiStats | null>(null)
  const [sensors, setSensors] = useState<SensorData>({ temperature: null, humidity: null })
  const [connected, setConnected] = useState(false)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${PI_STATS_URL}/api/stats`, {
        signal: AbortSignal.timeout(3000),
      })
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      setStats(data)
      setConnected(true)
    } catch {
      setConnected(false)
    }
  }, [])

  const fetchSensors = useCallback(async () => {
    try {
      const res = await fetch(`${PI_STATS_URL}/api/sensors`, {
        signal: AbortSignal.timeout(3000),
      })
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      setSensors(data)
    } catch {
      // sensors unavailable
    }
  }, [])

  useEffect(() => {
    fetchStats()
    fetchSensors()
    const interval = setInterval(() => {
      fetchStats()
      fetchSensors()
    }, intervalMs)
    return () => clearInterval(interval)
  }, [fetchStats, fetchSensors, intervalMs])

  return { stats, sensors, connected }
}
