import { useEffect, useRef } from 'react'

/** Polls `load` every `intervalMs` when the tab is visible; skips overlapping requests. */
export function usePolling(load: () => Promise<void>, intervalMs: number, enabled = true) {
  const loadRef = useRef(load)
  loadRef.current = load
  const inFlight = useRef(false)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let timer: number | undefined

    async function tick() {
      if (cancelled || document.visibilityState === 'hidden') return
      if (inFlight.current) return
      inFlight.current = true
      try {
        await loadRef.current()
      } finally {
        inFlight.current = false
      }
    }

    void tick()
    timer = window.setInterval(() => {
      void tick()
    }, intervalMs)

    const onVis = () => {
      if (document.visibilityState === 'visible') void tick()
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      cancelled = true
      if (timer) window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [intervalMs, enabled])
}
