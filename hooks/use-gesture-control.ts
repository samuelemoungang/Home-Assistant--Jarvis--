"use client"

import { useEffect, useRef, useCallback, useState } from "react"

const GESTURE_MANAGER_URL = "http://localhost:8082"

type GestureMode = "gesture" | "camera" | "finance"

interface GestureEvent {
  type: "navigate"
  target: string
  fingers: number
  mode: string
  timestamp: number
}

interface UseGestureControlOptions {
  onNavigate?: (target: string, fingers: number) => void
  enabled?: boolean
}

export function useGestureControl({ onNavigate, enabled = true }: UseGestureControlOptions) {
  const eventSourceRef = useRef<EventSource | null>(null)
  const [connected, setConnected] = useState(false)
  const [currentMode, setCurrentMode] = useState<GestureMode>("gesture")
  const [handDetected, setHandDetected] = useState(false)

  // Connect to SSE stream
  useEffect(() => {
    if (!enabled) return

    const connect = () => {
      try {
        const es = new EventSource(`${GESTURE_MANAGER_URL}/api/gesture-events`)
        
        es.onopen = () => {
          setConnected(true)
        }

        es.onmessage = (event) => {
          try {
            const data: GestureEvent = JSON.parse(event.data)
            if (data.type === "navigate" && onNavigate) {
              onNavigate(data.target, data.fingers)
            }
            setHandDetected(true)
            // Reset hand detected after 2 seconds
            setTimeout(() => setHandDetected(false), 2000)
          } catch (e) {
            // Ignore parse errors
          }
        }

        es.onerror = () => {
          setConnected(false)
          es.close()
          // Retry connection after 3 seconds
          setTimeout(connect, 3000)
        }

        eventSourceRef.current = es
      } catch (e) {
        setConnected(false)
        setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      eventSourceRef.current?.close()
    }
  }, [enabled, onNavigate])

  // Mode switching functions
  const switchToGestureMode = useCallback(async () => {
    try {
      const res = await fetch(`${GESTURE_MANAGER_URL}/api/mode/gesture`, { method: "POST" })
      const data = await res.json()
      if (data.success) setCurrentMode("gesture")
      return data.success
    } catch {
      return false
    }
  }, [])

  const switchToCameraMode = useCallback(async () => {
    try {
      const res = await fetch(`${GESTURE_MANAGER_URL}/api/mode/camera`, { method: "POST" })
      const data = await res.json()
      if (data.success) setCurrentMode("camera")
      return data.success
    } catch {
      return false
    }
  }, [])

  const switchToFinanceMode = useCallback(async () => {
    try {
      const res = await fetch(`${GESTURE_MANAGER_URL}/api/mode/finance`, { method: "POST" })
      const data = await res.json()
      if (data.success) setCurrentMode("finance")
      return data.success
    } catch {
      return false
    }
  }, [])

  return {
    connected,
    currentMode,
    handDetected,
    switchToGestureMode,
    switchToCameraMode,
    switchToFinanceMode,
  }
}
