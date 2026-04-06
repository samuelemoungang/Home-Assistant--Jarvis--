import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const STATS_STALE_MS = 60_000
const SNAPSHOT_STALE_MS = 30_000

type RuntimeRow = {
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

type SnapshotRow = {
  content_type: string
  image_base64: string | null
  source_updated_at: string
}

function getPiRemoteConfig() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  const deviceId = process.env.NEXT_PUBLIC_PI_DEVICE_ID || process.env.PI_DEVICE_ID || "raspberry-pi"
  const missingEnvVars: string[] = []

  if (!supabaseUrl) missingEnvVars.push("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL")
  if (!supabaseAnonKey) missingEnvVars.push("SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY")

  return {
    supabaseUrl,
    supabaseAnonKey,
    deviceId,
    missingEnvVars,
  }
}

function getAgeSeconds(isoDate: string | null | undefined) {
  if (!isoDate) return null
  const time = Date.parse(isoDate)
  if (Number.isNaN(time)) return null
  return Math.max(0, Math.round((Date.now() - time) / 1000))
}

function isFresh(isoDate: string | null | undefined, maxAgeMs: number) {
  const ageSeconds = getAgeSeconds(isoDate)
  if (ageSeconds === null) return false
  return ageSeconds * 1000 <= maxAgeMs
}

function buildSnapshotDataUrl(snapshot: SnapshotRow | null) {
  if (!snapshot?.image_base64) return null
  return `data:${snapshot.content_type || "image/jpeg"};base64,${snapshot.image_base64}`
}

function buildHints({
  deviceId,
  runtimeRow,
  snapshotRow,
  runtimeFresh,
  snapshotFresh,
}: {
  deviceId: string
  runtimeRow: RuntimeRow | null
  snapshotRow: SnapshotRow | null
  runtimeFresh: boolean
  snapshotFresh: boolean
}) {
  const hints: string[] = []

  if (!runtimeRow) {
    hints.push(`Nessuna riga trovata in pi_runtime_status per device_id "${deviceId}".`)
    hints.push("Controlla che il Raspberry Pi stia pubblicando con PI_DEVICE_ID uguale al device_id atteso dal sito.")
  } else if (!runtimeFresh) {
    hints.push("La riga runtime esiste ma e troppo vecchia.")
    hints.push("Controlla che pi-stats-service.py sia attivo e aggiorni source_updated_at almeno ogni 60 secondi.")
  }

  if (!snapshotRow) {
    hints.push(`Nessuna riga trovata in pi_camera_snapshots per device_id "${deviceId}".`)
    hints.push("Controlla che pi-camera-stream.py sia attivo e stia pubblicando snapshot su Supabase.")
  } else if (!snapshotFresh) {
    hints.push("Lo snapshot camera esiste ma e troppo vecchio.")
    hints.push("Controlla che pi-camera-stream.py aggiorni source_updated_at almeno ogni 30 secondi.")
  } else if (!snapshotRow.image_base64) {
    hints.push("La riga snapshot esiste ma image_base64 e vuoto.")
  }

  return hints
}

export async function GET() {
  const config = getPiRemoteConfig()

  if (config.missingEnvVars.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        deviceId: config.deviceId,
        reason: "missing_env",
        message: `Configurazione Supabase mancante sul deploy. Missing: ${config.missingEnvVars.join(", ")}.`,
        diagnostics: {
          missingEnvVars: config.missingEnvVars,
          runtime: null,
          snapshot: null,
          hints: [
            "Imposta le env Supabase nel deploy web e rifai il deploy.",
            `Imposta anche NEXT_PUBLIC_PI_DEVICE_ID=${config.deviceId} se il sito deve leggere quel device.`,
          ],
        },
      },
      { status: 500 },
    )
  }

  try {
    const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey)

    const [{ data: runtimeData, error: runtimeError }, { data: snapshotData, error: snapshotError }] = await Promise.all([
      supabase
        .from("pi_runtime_status")
        .select("cpu_temp, ram_percent, ram_used, ram_total, uptime, hand_detected, temperature, humidity, source_updated_at")
        .eq("device_id", config.deviceId)
        .maybeSingle(),
      supabase
        .from("pi_camera_snapshots")
        .select("content_type, image_base64, source_updated_at")
        .eq("device_id", config.deviceId)
        .maybeSingle(),
    ])

    if (runtimeError) {
      throw new Error(`Supabase runtime query failed: ${runtimeError.message}`)
    }

    if (snapshotError) {
      throw new Error(`Supabase snapshot query failed: ${snapshotError.message}`)
    }

    const runtimeRow = (runtimeData as RuntimeRow | null) ?? null
    const snapshotRow = (snapshotData as SnapshotRow | null) ?? null
    const runtimeFresh = isFresh(runtimeRow?.source_updated_at, STATS_STALE_MS)
    const snapshotFresh = isFresh(snapshotRow?.source_updated_at, SNAPSHOT_STALE_MS)
    const hints = buildHints({
      deviceId: config.deviceId,
      runtimeRow,
      snapshotRow,
      runtimeFresh,
      snapshotFresh,
    })

    if (!runtimeRow || !runtimeFresh) {
      return NextResponse.json(
        {
          ok: false,
          deviceId: config.deviceId,
          reason: !runtimeRow ? "missing_runtime" : "stale_runtime",
          message: `Nessuna statistica Raspberry Pi fresca trovata per device_id "${config.deviceId}".`,
          diagnostics: {
            missingEnvVars: [],
            runtime: {
              exists: Boolean(runtimeRow),
              sourceUpdatedAt: runtimeRow?.source_updated_at ?? null,
              ageSeconds: getAgeSeconds(runtimeRow?.source_updated_at),
              fresh: runtimeFresh,
            },
            snapshot: {
              exists: Boolean(snapshotRow),
              sourceUpdatedAt: snapshotRow?.source_updated_at ?? null,
              ageSeconds: getAgeSeconds(snapshotRow?.source_updated_at),
              fresh: snapshotFresh,
              hasImage: Boolean(snapshotRow?.image_base64),
            },
            hints,
          },
        },
        { status: 503 },
      )
    }

    return NextResponse.json({
      ok: true,
      deviceId: config.deviceId,
      stats: {
        cpu_temp: runtimeRow.cpu_temp,
        ram_percent: runtimeRow.ram_percent,
        ram_used: runtimeRow.ram_used,
        ram_total: runtimeRow.ram_total,
        uptime: runtimeRow.uptime,
        hand_detected: runtimeRow.hand_detected,
      },
      sensors: {
        temperature: runtimeRow.temperature,
        humidity: runtimeRow.humidity,
      },
      cameraSnapshot: snapshotFresh ? buildSnapshotDataUrl(snapshotRow) : null,
      diagnostics: {
        missingEnvVars: [],
        runtime: {
          exists: true,
          sourceUpdatedAt: runtimeRow.source_updated_at,
          ageSeconds: getAgeSeconds(runtimeRow.source_updated_at),
          fresh: true,
        },
        snapshot: {
          exists: Boolean(snapshotRow),
          sourceUpdatedAt: snapshotRow?.source_updated_at ?? null,
          ageSeconds: getAgeSeconds(snapshotRow?.source_updated_at),
          fresh: snapshotFresh,
          hasImage: Boolean(snapshotRow?.image_base64),
        },
        hints,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error"

    return NextResponse.json(
      {
        ok: false,
        deviceId: config.deviceId,
        reason: "query_failed",
        message: `Errore durante la lettura delle stats remote: ${message}`,
        diagnostics: {
          missingEnvVars: [],
          runtime: null,
          snapshot: null,
          hints: [
            "Controlla URL e chiavi Supabase del deploy web.",
            "Verifica che le policy SELECT su pi_runtime_status e pi_camera_snapshots siano attive.",
          ],
        },
      },
      { status: 500 },
    )
  }
}
