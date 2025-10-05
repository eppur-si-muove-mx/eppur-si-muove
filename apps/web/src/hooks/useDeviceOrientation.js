import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * useDeviceOrientation
 *
 * A React hook that:
 * - Accesses device gyroscope and accelerometer via DeviceOrientationEvent
 * - Returns alpha (compass), beta (front-back tilt), gamma (left-right tilt)
 * - Handles iOS permission request for DeviceOrientationEvent
 * - Normalizes values across devices and screen orientations
 * - Provides fallback for unsupported/denied
 */
export function useDeviceOrientation(options = {}) {
  const { autoStart = true } = options

  const supported = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window

  const [status, setStatus] = useState(supported ? 'idle' : 'unsupported') // idle | requesting | active | denied | unsupported | error
  const [error, setError] = useState(null)
  const [alpha, setAlpha] = useState(null)
  const [beta, setBeta] = useState(null)
  const [gamma, setGamma] = useState(null)

  const listenerActiveRef = useRef(false)

  const getScreenAngle = useCallback(() => {
    if (typeof window === 'undefined') return 0
    if (window.screen?.orientation && typeof window.screen.orientation.angle === 'number') {
      return window.screen.orientation.angle
    }
    if (typeof window.orientation === 'number') {
      return window.orientation
    }
    return 0
  }, [])

  const normalize = useCallback((a, b, g) => {
    // Normalize ranges
    // alpha: [0, 360)
    let na = (a ?? 0)
    if (Number.isFinite(na)) {
      na = ((na % 360) + 360) % 360
    } else {
      na = null
    }

    // beta: [-180, 180]
    let nb = Number.isFinite(b) ? Math.max(-180, Math.min(180, b)) : null

    // gamma: [-90, 90]
    let ng = Number.isFinite(g) ? Math.max(-90, Math.min(90, g)) : null

    // Adjust for screen orientation (portrait vs landscape)
    const angle = getScreenAngle()
    // Convert to 0/90/180/270
    const snapped = ((Math.round(angle / 90) * 90) % 360 + 360) % 360
    if (snapped === 90) {
      // Landscape left: swap axes
      const oldB = nb
      nb = ng
      ng = oldB != null ? -oldB : null
    } else if (snapped === 270) {
      // Landscape right
      const oldB = nb
      nb = ng != null ? -ng : null
      ng = oldB
    } else if (snapped === 180) {
      // Upside down portrait
      if (nb != null) nb = -nb
      if (ng != null) ng = -ng
      if (na != null) na = (na + 180) % 360
    }

    return { alpha: na, beta: nb, gamma: ng }
  }, [getScreenAngle])

  const onOrientation = useCallback((event) => {
    const { alpha: a, beta: b, gamma: g } = event
    const normalized = normalize(a, b, g)
    setAlpha(normalized.alpha)
    setBeta(normalized.beta)
    setGamma(normalized.gamma)
    setStatus('active')
  }, [normalize])

  const start = useCallback(async () => {
    if (!supported) {
      setStatus('unsupported')
      setError({ message: 'DeviceOrientationEvent not supported' })
      return
    }
    if (listenerActiveRef.current) return
    setStatus('requesting')
    setError(null)

    try {
      const needsPermission = typeof DeviceOrientationEvent.requestPermission === 'function'
      if (needsPermission) {
        // iOS 13+
        const response = await DeviceOrientationEvent.requestPermission()
        if (response !== 'granted') {
          setStatus('denied')
          return
        }
      }
      window.addEventListener('deviceorientation', onOrientation)
      listenerActiveRef.current = true
      setStatus('active')
    } catch (err) {
      setError({ message: err?.message, name: err?.name })
      setStatus('error')
    }
  }, [onOrientation, supported])

  const stop = useCallback(() => {
    if (!listenerActiveRef.current) return
    try {
      window.removeEventListener('deviceorientation', onOrientation)
    } catch (_) {}
    listenerActiveRef.current = false
    // Keep last values but mark inactive idle
    setStatus('idle')
  }, [onOrientation])

  // Optionally auto-start
  useEffect(() => {
    if (!autoStart) return undefined
    start()
    return () => {
      stop()
    }
  }, [autoStart, start, stop])

  // Update normalization when screen orientation changes
  useEffect(() => {
    function handleScreenChange() {
      // Trigger re-normalization using current stored values
      if (alpha == null && beta == null && gamma == null) return
      const normalized = normalize(alpha, beta, gamma)
      setAlpha(normalized.alpha)
      setBeta(normalized.beta)
      setGamma(normalized.gamma)
    }
    window.addEventListener('orientationchange', handleScreenChange)
    window.addEventListener('resize', handleScreenChange)
    return () => {
      window.removeEventListener('orientationchange', handleScreenChange)
      window.removeEventListener('resize', handleScreenChange)
    }
  }, [alpha, beta, gamma, normalize])

  return {
    // data
    alpha, // 0..360 (null if unavailable)
    beta,  // -180..180 normalized and orientation-adjusted
    gamma, // -90..90 normalized and orientation-adjusted

    // state
    status, // idle | requesting | active | denied | unsupported | error
    error,

    // controls
    start,
    stop,
    supported,
  }
}


