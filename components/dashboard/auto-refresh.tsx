"use client"

import { useEffect, useRef } from "react"

const CHECK_INTERVAL = 60_000 // check every 60 seconds

export function AutoRefresh() {
  const initialHash = useRef<string | null>(null)

  useEffect(() => {
    async function fetchHash() {
      try {
        const res = await fetch(window.location.href, {
          method: "HEAD",
          cache: "no-store",
        })
        // Use ETag or Last-Modified as version fingerprint
        const etag = res.headers.get("etag")
        const lastModified = res.headers.get("last-modified")
        return etag || lastModified || null
      } catch {
        return null
      }
    }

    // Capture the initial version on mount
    fetchHash().then((hash) => {
      initialHash.current = hash
    })

    const interval = setInterval(async () => {
      const currentHash = await fetchHash()
      if (
        initialHash.current &&
        currentHash &&
        initialHash.current !== currentHash
      ) {
        // New deploy detected, reload the page
        window.location.reload()
      }
    }, CHECK_INTERVAL)

    return () => clearInterval(interval)
  }, [])

  return null
}
