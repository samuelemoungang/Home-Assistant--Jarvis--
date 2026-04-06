"use client"

import { useState, useEffect, useCallback } from "react"

const PI_STATS_URL = process.env.NEXT_PUBLIC_PI_STATS_URL ?? "http://localhost:8080"
const DEFAULT_DEVICE_ID = process.env.NEXT_PUBLIC_PI_DEVICE_ID || "raspberry-pi"

export interface PiStats {
  cpu_temp: number
  ram_percent: number
  ram_used: number
  ram_total: number
  uptime: string
  hand_detected: boolean
}

export interface SensorData {
  temperature: number | null
  humidity: number | null
}

type DataSource = "local" | "remote" | "offline"
type PiStatsErrorKind = "config" | "unavailable"

export interface PiStatsError {
  kind: PiStatsErrorKind
  message: string
}

interface PiRemoteApiResponse {
  ok: boolean
  deviceId: string
  reason?: string
  message?: string
  stats?: PiStats
  sensors?: SensorData
  cameraSnapshot?: string | null
  diagnostics?: {
    missingEnvVars?: string[]
    runtime?: {
      exists: boolean
      sourceUpdatedAt: string | null
      ageSeconds: number | null
      fresh: boolean
    } | null
    snapshot?: {
      exists: boolean
      sourceUpdatedAt: string | null
      ageSeconds: number | null
      fresh: boolean
      hasImage: boolean
    } | null
    hints?: string[]
  }
}

function getMissingRemoteEnvVars() {
  const missing: string[] = []

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL")
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }

  return missing
}

function formatErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return "Unknown error"
}

function formatDiagnostics(response: PiRemoteApiResponse) {
  const hints = response.diagnostics?.hints?.filter(Boolean) ?? []
  const hintText = hints.length > 0 ? ` Hints: ${hints.join(" ")}` : ""
  return `${response.message ?? `Pi data unavailable for device_id "${response.deviceId}".`}${hintText}`
}

function toReadableError(error: unknown): PiStatsError {
  if (error instanceof Error && error.message.includes("Configurazione Supabase mancante")) {
    const missingVars = getMissingRemoteEnvVars()
    const suffix = missingVars.length > 0 ? ` Missing: ${missingVars.join(", ")}.` : ""
    return {
      kind: "config",
      message: `Remote Pi monitoring is not configured on this deployment.${suffix} Add the Supabase env vars to the deploy and redeploy.`,
    }
  }

  if (error instanceof Error && error.message === "Local Pi stats unavailable") {
    return {
      kind: "unavailable",
      message: `Local Pi API did not respond at ${PI_STATS_URL}/api/stats and the remote fallback also failed. Check the Pi service and the Supabase sync.`,
    }
  }

  if (error instanceof Error && error.message) {
    return {
      kind: "unavailable",
      message: `Pi data unavailable for device_id "${DEFAULT_DEVICE_ID}". ${formatErrorMessage(error)}.`,
    }
  }

  if (error instanceof Error && error.message) {
    return {
      kind: "unavailable",
      message: `Pi data unavailable (${error.message}). Check Supabase tables, device_id, and source_updated_at freshness.`,
    }
  }

  return {
    kind: "unavailable",
    message: `Pi service not connected for device_id "${DEFAULT_DEVICE_ID}". Start pi-stats-service.py on the Pi or verify remote sync in Supabase.`,
  }
}

export function usePiStats(intervalMs = 5000) {
  const [stats, setStats] = useState<PiStats | null>(null)
  const [sensors, setSensors] = useState<SensorData>({ temperature: null, humidity: null })
  const [connected, setConnected] = useState(false)
  const [cameraSnapshot, setCameraSnapshot] = useState<string | null>(null)
  const [source, setSource] = useState<DataSource>("offline")
  const [error, setError] = useState<PiStatsError | null>(null)

  const fetchLocal = useCallback(async () => {
    if (!PI_STATS_URL.trim()) {
      throw new Error("Local Pi URL is disabled")
    }

    const [statsRes, sensorsRes] = await Promise.all([
      fetch(`${PI_STATS_URL}/api/stats`, { signal: AbortSignal.timeout(3000) }),
      fetch(`${PI_STATS_URL}/api/sensors`, { signal: AbortSignal.timeout(3000) }),
    ])

    if (!statsRes.ok) {
      throw new Error("Local Pi stats unavailable")
    }

    const statsData: PiStats = await statsRes.json()
    let sensorData: SensorData = { temperature: null, humidity: null }

    if (sensorsRes.ok) {
      sensorData = await sensorsRes.json()
    }

    setStats(statsData)
    setSensors(sensorData)
    setConnected(true)
    setSource("local")
    setCameraSnapshot(null)
    setError(null)
  }, [])

  const fetchRemote = useCallback(async () => {
    const response = await fetch("/api/pi-remote", {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    })

    const payload = (await response.json()) as PiRemoteApiResponse

    if (!response.ok || !payload.ok || !payload.stats || !payload.sensors) {
      throw new Error(formatDiagnostics(payload))
    }

    setStats(payload.stats)
    setSensors(payload.sensors)
    setCameraSnapshot(payload.cameraSnapshot ?? null)
    setConnected(true)
    setSource("remote")
    setError(null)
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      await fetchLocal()
      return
    } catch {
      // Fall back to Supabase when localhost is unavailable.
    }

    try {
      await fetchRemote()
    } catch (error) {
      setConnected(false)
      setSource("offline")
      setCameraSnapshot(null)
      setError(toReadableError(error))
    }
  }, [fetchLocal, fetchRemote])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, intervalMs)
    return () => clearInterval(interval)
  }, [fetchStats, intervalMs])

  return { stats, sensors, connected, source, cameraSnapshot, error }
}
