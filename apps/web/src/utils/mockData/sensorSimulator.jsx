"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'

// Sensor Simulator for development (JS version)

export function useMockOrientation(initial = {}) {
  const envEnabled =
    (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_USE_MOCK_SENSORS === 'true' || process.env.NEXT_PUBLIC_USE_MOCK_SENSORS === '1' || process.env.USE_MOCK_SENSORS === 'true')) ||
    (typeof window !== 'undefined' && window.__USE_MOCK_SENSORS === true)

  const [enabled] = useState(!!envEnabled)
  const [alpha, setAlpha] = useState(initial.alpha ?? 0)
  const [beta, setBeta] = useState(initial.beta ?? 0)
  const [gamma, setGamma] = useState(initial.gamma ?? 0)

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
  const wrap360 = (v) => {
    let x = v % 360
    if (x < 0) x += 360
    return x
  }

  const stepAlpha = useCallback((delta) => setAlpha((a) => wrap360(a + delta)), [])
  const stepBeta = useCallback((delta) => setBeta((b) => clamp(b + delta, -90, 90)), [])
  const stepGamma = useCallback((delta) => setGamma((g) => clamp(g + delta, -90, 90)), [])

  const lookNorth = useCallback(() => { setAlpha(0); setBeta(0); setGamma(0); logDirection(0, 0, 0) }, [])
  const lookSouth = useCallback(() => { setAlpha(180); setBeta(0); setGamma(0); logDirection(180, 0, 0) }, [])
  const lookEast = useCallback(() => { setAlpha(90); setBeta(0); setGamma(0); logDirection(90, 0, 0) }, [])
  const lookWest = useCallback(() => { setAlpha(270); setBeta(0); setGamma(0); logDirection(270, 0, 0) }, [])
  const lookUp = useCallback(() => { setBeta(90); setGamma(0); logDirection(alpha, 90, 0) }, [alpha])

  useEffect(() => {
    if (!enabled) return
    const handler = (e) => {
      const mult = e.shiftKey ? 3 : 1
      const step = 2 * mult
      switch (e.key.toLowerCase()) {
        case 'arrowleft': case 'a': stepAlpha(-step); break
        case 'arrowright': case 'd': stepAlpha(+step); break
        case 'arrowup': case 'w': stepBeta(+step); break
        case 'arrowdown': case 's': stepBeta(-step); break
        case 'q': stepGamma(-step); break
        case 'e': stepGamma(+step); break
        case '1': lookNorth(); break
        case '2': lookEast(); break
        case '3': lookSouth(); break
        case '4': lookWest(); break
        case '5': lookUp(); break
        default: return
      }
      e.preventDefault()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled, lookEast, lookNorth, lookSouth, lookUp, lookWest, stepAlpha, stepBeta, stepGamma])

  useEffect(() => {
    if (!enabled) return
    logDirection(alpha, beta, gamma)
  }, [enabled, alpha, beta, gamma])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    window.MOCK_ORI = {
      get: () => ({ alpha, beta, gamma }),
      lookNorth, lookSouth, lookEast, lookWest, lookUp,
      set: (a, b, g) => { setAlpha(a); setBeta(b); setGamma(g) },
    }
  }, [enabled, alpha, beta, gamma, lookEast, lookNorth, lookSouth, lookUp, lookWest])

  const direction = useMemo(() => humanDirection(alpha, beta), [alpha, beta])

  const DebugPanel = useMemo(() => {
    if (!enabled) return null
    return (
      <div className="pointer-events-none fixed bottom-2 right-2 z-[40]">
        <div className="pointer-events-auto rounded-md bg-background/80 backdrop-blur-md border px-3 py-2 text-xs font-mono shadow">
          <div><b>Mock Sensors</b> ({direction})</div>
          <div>alpha: {alpha.toFixed(1)} beta: {beta.toFixed(1)} gamma: {gamma.toFixed(1)}</div>
          <div>←/A →/D: azimuth | ↑/W ↓/S: altitude | Q/E: roll</div>
          <div>1:N 2:E 3:S 4:W 5:Up</div>
        </div>
      </div>
    )
  }, [enabled, direction, alpha, beta, gamma])

  return {
    enabled,
    alpha,
    beta,
    gamma,
    setAlpha,
    setBeta,
    setGamma,
    lookNorth,
    lookSouth,
    lookEast,
    lookWest,
    lookUp,
    DebugPanel,
  }
}

function humanDirection(alpha, beta) {
  if (beta > 75) return 'Up'
  const a = ((alpha % 360) + 360) % 360
  if (a >= 315 || a < 45) return 'North'
  if (a >= 45 && a < 135) return 'East'
  if (a >= 135 && a < 225) return 'South'
  return 'West'
}

function logDirection(alpha, beta, gamma) {
  // eslint-disable-next-line no-console
  console.log('[MOCK ORI]', humanDirection(alpha, beta), {
    alpha: Number(alpha.toFixed(1)),
    beta: Number(beta.toFixed(1)),
    gamma: Number(gamma.toFixed(1)),
  })
}

export default useMockOrientation


