"use client"

import { useEffect, useMemo, useRef } from 'react'
import { CelestialDataManager } from '@/utils/data/celestialDataManager'
import { raDecToAltAz, enuVectorFromAltAz, projectToScreen } from '@/lib/astro/projection'
import { useDeviceOrientation } from '@/hooks/useDeviceOrientation'
import { useGeolocation } from '@/hooks/useGeolocation'

// Phase 1: simple Canvas overlay rendering bright dots for nearby stars.
export default function ARStarRenderer({ fovDeg = 65, maxStars = 500 }) {
  const canvasRef = useRef(null)
  const orientation = useDeviceOrientation({ autoStart: true })
  const geo = useGeolocation({ autoRequest: true, autoWatch: true, enableHighAccuracy: true })
  const FALLBACK = { lat: 20.67053404521385, lon: -103.37833696752742 }

  const stars = useMemo(() => {
    // Limit to maxStars nearest to some heuristic (e.g., larger radius/temp)
    const all = CelestialDataManager.getAllObjects()
    // Simple weight: hotter + larger first
    return all
      .slice()
      .sort((a, b) => (b.temp_estrella * b.radio_estrella) - (a.temp_estrella * a.radio_estrella))
      .slice(0, maxStars)
  }, [maxStars])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf = 0
    let lastLSTRecalc = 0
    let cachedAltAz = []

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(canvas.clientWidth * dpr)
      canvas.height = Math.round(canvas.clientHeight * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    function draw(ts) {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      ctx.clearRect(0, 0, w, h)

      const lat = Number.isFinite(geo.latitude) ? geo.latitude : FALLBACK.lat
      const lon = Number.isFinite(geo.longitude) ? geo.longitude : FALLBACK.lon

      // Recompute Alt/Az ~1/sec (time/LST changes) to reduce CPU
      if (ts - lastLSTRecalc > 1000 || cachedAltAz.length !== stars.length) {
        cachedAltAz = stars.map((s) => {
          const { altitude, azimuth } = raDecToAltAz((s.Loc1_RA / 15), s.Loc2_DEC, lat, lon, new Date())
          return { altitude, azimuth }
        })
        lastLSTRecalc = ts
      }

      // Map ENU to camera frame using device yaw/pitch (ignore roll for now)
      const a = (orientation.alpha ?? 0) * Math.PI / 180 // yaw (0=N)
      const b = (orientation.beta ?? 0) * Math.PI / 180  // pitch up/down
      const cosA = Math.cos(-a), sinA = Math.sin(-a)   // rotate by -alpha around Z
      const cosB = Math.cos(-b), sinB = Math.sin(-b)   // then -beta around X

      for (let i = 0; i < stars.length; i += 1) {
        const { altitude, azimuth } = cachedAltAz[i]
        if (altitude < -5) continue // skip far below horizon
        const v = enuVectorFromAltAz(altitude, azimuth)

        // Z-rotation (heading)
        const vx1 =  v.x * cosA - v.y * sinA
        const vy1 =  v.x * sinA + v.y * cosA
        const vz1 =  v.z
        // X-rotation (pitch)
        const vx2 = vx1
        const vy2 = vy1 * cosB - vz1 * sinB
        const vz2 = vy1 * sinB + vz1 * cosB

        const p = projectToScreen({ x: vx2, y: vy2, z: vz2 }, fovDeg, w, h)
        if (!p) continue
        // brightness heuristic
        const star = stars[i]
        const bright = Math.min(1, (star.temp_estrella - 3000) / 7000 * 0.8 + (star.radio_estrella / 10) * 0.2)
        const r = 1 + 2 * bright
        ctx.beginPath()
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * bright})`
        ctx.fill()
      }

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [fovDeg, geo.latitude, geo.longitude, stars])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}
    />
  )
}


