"use client"

import { useState, useEffect, useCallback } from "react"

import { createClient } from "@/lib/supabase/client"

const PI_STATS_URL = "http://localhost:8080"
const DEFAULT_DEVICE_ID = process.env.NEXT_PUBLIC_PI_DEVICE_ID || "raspberry-pi"
const STATS_STALE_MS = 60_000
const SNAPSHOT_STALE_MS = 30_000

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

interface RemoteRuntimeRow {
  cpu_temp: number
  ram_percent: number
  ram_used: number
  ram_total: number
  uptime: string
  hand_detected: boolean
  temperature: number | null
  humidity: number | null
  source_updated_at: string
}

interface RemoteSnapshotRow {
  content_type: string
  image_base64: string | null
  source_updated_at: string
}

function isFresh(isoDate: string | null | undefined, maxAgeMs: number) {
  if (!isoDate) return false
  const time = Date.parse(isoDate)
  if (Number.isNaN(time)) return false
  return Date.now() - time <= maxAgeMs
}

function buildSnapshotDataUrl(snapshot: RemoteSnapshotRow | null) {
  if (!snapshot?.image_base64) return null
  return `data:${snapshot.content_type || "image/jpeg"};base64,${snapshot.image_base64}`
}

export function usePiStats(intervalMs = 5000) {
  const [stats, setStats] = useState<PiStats | null>(null)
  const [sensors, setSensors] = useState<SensorData>({ temperature: null, humidity: null })
  const [connected, setConnected] = useState(false)
  const [cameraSnapshot, setCameraSnapshot] = useState<string | null>(null)
  const [source, setSource] = useState<DataSource>("offline")

  const fetchLocal = useCallback(async () => {
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
  }, [])

  const fetchRemote = useCallback(async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase client env is missing")
    }

    const supabase = createClient()

    const [{ data: runtimeData, error: runtimeError }, { data: snapshotData, error: snapshotError }] = await Promise.all([
      supabase
        .from("pi_runtime_status")
        .select("cpu_temp, ram_percent, ram_used, ram_total, uptime, hand_detected, temperature, humidity, source_updated_at")
        .eq("device_id", DEFAULT_DEVICE_ID)
        .maybeSingle(),
      supabase
        .from("pi_camera_snapshots")
        .select("content_type, image_base64, source_updated_at")
        .eq("device_id", DEFAULT_DEVICE_ID)
        .maybeSingle(),
    ])

    const runtimeRow = runtimeData as RemoteRuntimeRow | null
    const snapshotRow = snapshotData as RemoteSnapshotRow | null

    if (runtimeError) {
      throw runtimeError
    }

    if (snapshotError) {
      throw snapshotError
    }

    if (!runtimeRow || !isFresh(runtimeRow.source_updated_at, STATS_STALE_MS)) {
      throw new Error("Remote Pi stats are stale or missing")
    }

    setStats({
      cpu_temp: runtimeRow.cpu_temp,
      ram_percent: runtimeRow.ram_percent,
      ram_used: runtimeRow.ram_used,
      ram_total: runtimeRow.ram_total,
      uptime: runtimeRow.uptime,
      hand_detected: runtimeRow.hand_detected,
    })
    setSensors({
      temperature: runtimeRow.temperature,
      humidity: runtimeRow.humidity,
    })
    setCameraSnapshot(isFresh(snapshotRow?.source_updated_at, SNAPSHOT_STALE_MS) ? buildSnapshotDataUrl(snapshotRow ?? null) : null)
    setConnected(true)
    setSource("remote")
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
    } catch {
      setConnected(false)
      setSource("offline")
      setCameraSnapshot(null)
    }
  }, [fetchLocal, fetchRemote])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, intervalMs)
    return () => clearInterval(interval)
  }, [fetchStats, intervalMs])

  return { stats, sensors, connected, source, cameraSnapshot }
}
