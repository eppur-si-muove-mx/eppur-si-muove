"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { useCameraSource } from '@/hooks/useCameraSource'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useDeviceOrientation } from '@/hooks/useDeviceOrientation'

export default function CameraDemo() {
  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isSecure = typeof window !== 'undefined' ? window.isSecureContext : false
  const initialSimulate = (process.env.NODE_ENV !== 'production' && !isIOS) || (isIOS && !isSecure)
  const [simulate, setSimulate] = useState(initialSimulate)
  const [debug, setDebug] = useState(false)

  const camera = useCameraSource({ autoStart: false, debug, simulate, frameRate: 30, facingMode: 'environment' })
  const { isActive, isLoading, error, start, stop, video } = camera

  const geo = useGeolocation({ autoRequest: true, autoWatch: true, enableHighAccuracy: true })
  const { status: geoStatus, latitude, longitude, accuracy } = geo

  const ori = useDeviceOrientation({ autoStart: false })
  const { alpha, beta, gamma, status: oriStatus, start: startMotion } = ori

  const videoRef = useRef(null)
  const [isNarrow, setIsNarrow] = useState(false)
  useEffect(() => {
    const update = () => setIsNarrow(typeof window !== 'undefined' ? window.innerWidth < 700 : false)
    update()
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])
  useEffect(() => {
    if (!camera.stream || !videoRef.current) return
    try {
      videoRef.current.srcObject = camera.stream
    } catch (_) {
      // iOS older fallbacks
      if (camera.video?.src) videoRef.current.src = camera.video.src
    }
    const p = videoRef.current.play()
    if (p && typeof p.catch === 'function') p.catch(() => {})
  }, [camera.stream, camera.video])

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => (isActive ? stop() : start())} style={btnStyle}>
          {isActive ? 'Stop' : 'Start'} camera
        </button>
        {isIOS && (
          <span style={{ fontSize: 12, opacity: 0.8 }}>iOS requires a user tap to start camera.</span>
        )}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={simulate} onChange={(e) => setSimulate(e.target.checked)} />
          Simulate camera
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} />
          Debug overlay
        </label>
        <button onClick={() => startMotion()} style={btnStyle}>Enable Motion</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1fr 320px', gap: 16 }}>
        <div style={{ position: 'relative', background: '#000', borderRadius: 8, overflow: 'hidden' }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: 'auto', display: 'block' }} />
          {isLoading && (
            <div style={overlayStyle}>Loading…</div>
          )}
          {error && (
            <div style={{ ...overlayStyle, color: '#ff6b6b' }}>{error.message || 'Camera error'}</div>
          )}
        </div>

        <div style={{ display: 'grid', gap: 8, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
          <h3 style={{ margin: 0 }}>Sensors</h3>
          <div>Camera: {isActive ? 'active' : isLoading ? 'loading' : 'idle'}</div>
          <div>Geolocation: {geoStatus}</div>
          <div>
            Lat/Lng: {fmt(latitude)}, {fmt(longitude)} (±{fmt(accuracy)} m)
          </div>
          <div>Orientation: {oriStatus} {!isSecure && ' (requires HTTPS)'} {isIOS && ' (tap Enable Motion)'}
          </div>
          <div>alpha: {fmt(alpha)} beta: {fmt(beta)} gamma: {fmt(gamma)}</div>
        </div>
      </div>
    </div>
  )
}

const btnStyle = {
  padding: '8px 12px',
  border: '1px solid #333',
  borderRadius: 6,
  background: '#111',
  color: '#eee',
  cursor: 'pointer',
}

const overlayStyle = {
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.35)',
  color: '#fff',
  fontWeight: 600,
}

function fmt(x) {
  if (x == null || Number.isNaN(x)) return '—'
  return Math.round(x * 1000) / 1000
}


