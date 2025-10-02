"use client"

import { useEffect, useMemo, useRef } from 'react'
import { CelestialDataManager } from '@/utils/data/celestialDataManager'
import { raDecToAltAz, enuVectorFromAltAz, projectToScreen } from '@/lib/astro/projection'
import { useDeviceOrientation } from '@/hooks/useDeviceOrientation'
import { useGeolocation } from '@/hooks/useGeolocation'

// Quaternion helpers
function qAxisAngle(x, y, z, angle) {
  const half = angle * 0.5
  const s = Math.sin(half)
  return { x: x * s, y: y * s, z: z * s, w: Math.cos(half) }
}
function qMul(a, b) {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  }
}
function qConj(q) { return { x: -q.x, y: -q.y, z: -q.z, w: q.w } }
function qRotateVec(q, v) {
  const vx = { x: v.x, y: v.y, z: v.z, w: 0 }
  const qi = qConj(q)
  const t = qMul(q, vx)
  const r = qMul(t, qi)
  return { x: r.x, y: r.y, z: r.z }
}

// Phase 1: simple Canvas overlay rendering bright dots for nearby stars.
export default function ARStarRenderer({ fovDeg = 65, maxStars = 500, orientation: extOrientation }) {
  const canvasRef = useRef(null)
  const internalOri = useDeviceOrientation({ autoStart: true })
  const orientation = extOrientation && (Number.isFinite(extOrientation.alpha) || Number.isFinite(extOrientation.beta))
    ? extOrientation
    : internalOri
  const oriRef = useRef({ alpha: 0, beta: 0 })
  useEffect(() => {
    const a = Number.isFinite(orientation.alpha) ? orientation.alpha : 0
    const b = Number.isFinite(orientation.beta) ? orientation.beta : 0
    oriRef.current = { alpha: a, beta: b }
  }, [orientation.alpha, orientation.beta])
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

      // Screen orientation (portrait/landscape) compensation
      const angle = (window.screen?.orientation?.angle ?? window.orientation ?? 0)
      const orientRad = Math.round(angle / 90) * 90 * Math.PI / 180

      // Map ENU to camera frame using quaternion to avoid gimbal lock.
      const rawA = oriRef.current.alpha || 0
      const rawB = oriRef.current.beta  || 0
      const rawG = Number.isFinite(orientation.gamma) ? orientation.gamma : 0
      const a = rawA * Math.PI / 180
      const b = rawB * Math.PI / 180
      const g = rawG * Math.PI / 180

      // DeviceOrientation (Z-X'-Y'') and screen orientation
      const qz = qAxisAngle(0,0,1, -a)  // -alpha
      const qx = qAxisAngle(1,0,0, -b)  // -beta
      const qy = qAxisAngle(0,1,0, -g)  // -gamma
      const qOrient = qAxisAngle(0,0,1, -orientRad) // screen rotation
      const qCam = qMul(qOrient, qMul(qy, qMul(qx, qz)))

      for (let i = 0; i < stars.length; i += 1) {
        const { altitude, azimuth } = cachedAltAz[i]
        if (altitude < -5) continue // skip far below horizon
        const v = enuVectorFromAltAz(altitude, azimuth)
        const vCam = qRotateVec(qCam, v)
        const p = projectToScreen(vCam, fovDeg, w, h)
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

      // Debug crosshair
      ctx.strokeStyle = 'rgba(0,255,153,0.4)'
      ctx.beginPath(); ctx.moveTo(w/2-10,h/2); ctx.lineTo(w/2+10,h/2); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(w/2,h/2-10); ctx.lineTo(w/2,h/2+10); ctx.stroke()

      // Debug text
      ctx.fillStyle = 'rgba(0,255,153,0.7)'
      ctx.font = '12px monospace'
      const dbgA = oriRef.current.alpha
      const dbgB = oriRef.current.beta
      ctx.fillText(`alpha=${dbgA.toFixed(1)} beta=${dbgB.toFixed(1)} orient=${Math.round(orientRad*180/Math.PI)}`, 8, 16)

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


