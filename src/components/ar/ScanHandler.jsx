"use client"

import { useCallback, useMemo, useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useDeviceOrientation } from '@/hooks/useDeviceOrientation'
import { useMockOrientation } from '@/utils/mockData/sensorSimulator'
import calculateSearchArea from '@/utils/searchArea'
import searchCelestialObjects from '@/utils/data/spatialSearch'

function humanDirection(alpha, beta) {
  if (beta > 60) return 'Up'
  const a = ((alpha % 360) + 360) % 360
  if (a >= 315 || a < 45) return 'North'
  if (a >= 45 && a < 135) return 'East'
  if (a >= 135 && a < 225) return 'South'
  return 'West'
}

export function useScan() {
  // Sensors
  const geo = useGeolocation({ autoRequest: true, autoWatch: true, enableHighAccuracy: true })
  const device = useDeviceOrientation({ autoStart: false })
  const mock = useMockOrientation()

  const [state, setState] = useState('idle')
  const [results, setResults] = useState([])
  const [progress, setProgress] = useState(0)
  const [highlight, setHighlight] = useState(false)

  const orientation = useMemo(() => {
    // Prefer mock if enabled for deterministic desktop testing
    const a = mock.enabled ? mock.alpha : (device.alpha ?? NaN)
    const b = mock.enabled ? mock.beta : (device.beta ?? NaN)
    const g = mock.enabled ? mock.gamma : (device.gamma ?? NaN)
    return { alpha: a, beta: b, gamma: g, mock: mock.enabled }
  }, [device.alpha, device.beta, device.gamma, mock.alpha, mock.beta, mock.gamma, mock.enabled])

  const getPosition = useCallback(() => {
    return {
      latitude: geo.latitude ?? NaN,
      longitude: geo.longitude ?? NaN,
    }
  }, [geo.latitude, geo.longitude])

  // Motion status feedback
  const motionStatus = device.status
  const enableMotion = useCallback(async () => {
    try {
      await device.start()
    } catch (_) {}
  }, [device])

  // Visual feedback when motion permission changes
  useEffect(() => {
    if (motionStatus === 'active') toast.success('Motion enabled', { id: 'motion' })
    else if (motionStatus === 'denied') toast.error('Motion access denied', { id: 'motion' })
    else if (motionStatus === 'unsupported') toast.error('Motion not supported', { id: 'motion' })
  }, [motionStatus])

  const scanArea = useCallback(async () => {
    try {
      setState('scanning')
      setProgress(0)
      toast.loading('Scanning...', { id: 'scan' })
      console.log('[SCAN] starting')

      // Read latest orientation directly to avoid stale memo just after granting permission
      const readOrientation = () => ({
        alpha: mock.enabled ? mock.alpha : (device.alpha ?? NaN),
        beta: mock.enabled ? mock.beta : (device.beta ?? NaN),
        gamma: mock.enabled ? mock.gamma : (device.gamma ?? NaN),
      })
      let { alpha, beta, gamma } = readOrientation()
      let { latitude, longitude } = getPosition()
      if (!isFinite(latitude) || !isFinite(longitude)) {
        // Use fallback for testing
        latitude = 20.67053404521385
        longitude = -103.37833696752742
      }
      console.log('[SCAN] orientation', { alpha, beta, gamma, mock: orientation.mock })
      console.log('[SCAN] position', { latitude, longitude })

      // If motion is not yet active, request it and wait briefly for first sample (iOS quirk)
      if (!isFinite(alpha) || !isFinite(beta) || !isFinite(gamma)) {
        try { await device.start() } catch (_) {}
        const start = Date.now()
        while (Date.now() - start < 1500) {
          await new Promise(r => setTimeout(r, 100))
          const o = readOrientation()
          if (isFinite(o.alpha) && isFinite(o.beta) && isFinite(o.gamma)) {
            alpha = o.alpha; beta = o.beta; gamma = o.gamma; break
          }
        }
      }
      if (!isFinite(alpha) || !isFinite(beta) || !isFinite(gamma)) {
        throw new Error('Orientation not available. Enable Motion access.')
      }
      if (!isFinite(latitude) || !isFinite(longitude)) {
        // Request and wait briefly for a GPS fix (iOS may take a moment)
        try { await geo.requestPermission?.() } catch (_) {}
        try { await geo.refresh?.() } catch (_) {}
        const start = Date.now()
        while (Date.now() - start < 3000) {
          await new Promise(r => setTimeout(r, 150))
          if (isFinite(geo.latitude) && isFinite(geo.longitude)) {
            latitude = geo.latitude
            longitude = geo.longitude
            break
          }
        }
        if (!isFinite(latitude) || !isFinite(longitude)) {
          throw new Error('Location not available. Allow location access.')
        }
      }

      // Haptics where supported
      try { navigator.vibrate?.(30) } catch (_) {}

      const searchArea = calculateSearchArea(alpha, beta, gamma, latitude, longitude)
      console.log('[SCAN] searchArea', searchArea)

      setState('processing')
      // Fixed 2.5s processing with progress updates and logs
      const total = 2500
      const step = 50
      let elapsed = 0
      while (elapsed < total) {
        await new Promise((r) => setTimeout(r, step))
        elapsed += step
        const pct = Math.min(100, Math.round((elapsed / total) * 100))
        setProgress(pct)
        if (pct === 25 || pct === 50 || pct === 75) console.log(`[SCAN] ${pct}% complete`)
      }
      setProgress(100)
      console.log('[SCAN] 100% complete')

      const found = searchCelestialObjects(searchArea, undefined, { alpha, beta })
      console.log('[SCAN] search results', found)
      setResults(found)
      setState('complete')

      if (found.length > 0) {
        toast.success(`Found ${found.length} objects!`, { id: 'scan' })
        // Emphasize briefly
        setHighlight(true)
        setTimeout(() => setHighlight(false), 800)
        try { navigator.vibrate?.([20, 30, 20]) } catch (_) {}
      } else {
        toast.message('No objects in this area', { id: 'scan' })
      }

      return found
    } catch (err) {
      console.error('[SCAN] failed', err)
      setState('idle')
      toast.error('Scan failed', { id: 'scan' })
      return []
    }
  }, [getPosition, orientation])

  return {
    scanArea,
    state,
    results,
    ui: {
      Overlay: (
        <ScanningOverlay
          visible={state === 'scanning' || state === 'processing'}
          direction={humanDirection(orientation.alpha, orientation.beta)}
          progress={progress}
          highlight={highlight}
        />
      ),
      progress,
      direction: humanDirection(orientation.alpha, orientation.beta),
      highlight,
    },
    sensors: {
      orientation,
      geolocation: { status: geo.status, latitude: geo.latitude, longitude: geo.longitude },
      startMotion: enableMotion,
      motionStatus,
    },
  }
}

export default useScan

// Visual scanning overlay
function ScanningOverlay({ visible, direction, progress, highlight }) {
  if (!visible && !highlight) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-[30] flex items-center justify-center">
      <div className="absolute inset-0" style={{
        background: visible ? 'radial-gradient(circle at center, rgba(37,99,235,0.10), rgba(0,0,0,0.0) 60%)' : 'transparent'
      }} />
      {/* Pulsing expanding ring */}
      <div className="relative w-[60vmin] h-[60vmin] flex items-center justify-center">
        <div className={`absolute rounded-full border border-cosmic-blue-500/50 ${visible ? 'scan-ring' : ''}`} style={{ width: '20vmin', height: '20vmin' }} />
        <div className={`absolute rounded-full border border-cosmic-blue-500/30 ${visible ? 'scan-ring delay-150' : ''}`} style={{ width: '28vmin', height: '28vmin' }} />
        <div className={`absolute rounded-full border border-cosmic-blue-500/20 ${visible ? 'scan-ring delay-300' : ''}`} style={{ width: '36vmin', height: '36vmin' }} />
      </div>

      {/* Progress and text */}
      {/* {visible && (
        <div className="absolute bottom-10 w-full flex flex-col items-center gap-2">
          <div className="text-sm opacity-80">Scanning {direction}...</div>
          <div className="w-64 h-2 bg-white/10 rounded overflow-hidden">
            <div className="h-full bg-cosmic-blue-500/80" style={{ width: `${progress}%`, transition: 'width 50ms linear' }} />
          </div>
          <div className="text-xs opacity-70">{progress}%</div>
        </div>
      )} */}

      {/* Direction flash after complete */}
      {/* {highlight && (
        <div className="absolute top-10 px-3 py-1 rounded bg-cosmic-blue-500/80 text-white text-sm">Objects ahead ({direction})</div>
      )} */}

      <style jsx>{`
        .scan-ring {
          animation: scanPulse 2.5s ease-in-out infinite;
        }
        .delay-150 { animation-delay: 150ms; }
        .delay-300 { animation-delay: 300ms; }
        @keyframes scanPulse {
          0% { transform: scale(0.7); opacity: 0.9; }
          70% { transform: scale(1.4); opacity: 0.1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  )
}


