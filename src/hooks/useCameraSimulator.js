import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDeviceOrientation } from './useDeviceOrientation'

/**
 * useCameraSimulator
 *
 * Canvas-based simulated camera feed that produces a MediaStream via captureStream,
 * mimicking a real camera for development and testing.
 *
 * Features:
 * - Day/night gradient sky
 * - Animated star field (twinkling, slight drift)
 * - Moving, semi-transparent clouds
 * - Optional debug overlay showing device orientation
 * - API parity with useCamera: { isLoading, isActive, error, orientation, video, stream, start, stop }
 */
export function useCameraSimulator(options = {}) {
  const {
    width = 640,
    height = 480,
    frameRate = 30,
    autoStart = false,
    debug = false,
    showStars = true,
    showClouds = true,
  } = options

  const [isLoading, setIsLoading] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState(null)
  const [orientation, setOrientation] = useState(getOrientation())

  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const videoRef = useRef(null)
  const rafRef = useRef(0)

  // Orientation data for debug overlay
  const { alpha, beta, gamma } = useDeviceOrientation({ autoStart: true })

  const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1
  const internalSize = useMemo(() => ({ w: Math.round(width * dpr), h: Math.round(height * dpr) }), [width, height, dpr])

  // Star field + clouds state
  const starsRef = useRef([])
  const cloudsRef = useRef([])

  const initScene = useCallback((rng) => {
    // Initialize stars
    const numStars = Math.floor((width * height) / 800) // density scaling
    const stars = []
    for (let i = 0; i < numStars; i += 1) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.2 + 0.3,
        tw: Math.random() * Math.PI * 2,
        sp: 0.02 + Math.random() * 0.05,
      })
    }
    starsRef.current = stars

    // Initialize clouds as blobs
    const numClouds = Math.max(2, Math.floor((width + height) / 400))
    const clouds = []
    for (let i = 0; i < numClouds; i += 1) {
      const cx = Math.random() * width
      const cy = Math.random() * (height * 0.5)
      const scale = 80 + Math.random() * 120
      clouds.push({
        x: cx,
        y: cy,
        vx: 5 + Math.random() * 15,
        scale,
        alpha: 0.08 + Math.random() * 0.06,
      })
    }
    cloudsRef.current = clouds
  }, [height, width])

  const drawSkyGradient = useCallback((ctx, w, h, t) => {
    // Day-night factor based on local time (sinusoidal over 24h)
    const now = new Date()
    const minutes = now.getHours() * 60 + now.getMinutes()
    const phase = (minutes / (24 * 60)) * Math.PI * 2
    const dayFactor = (Math.sin(phase - Math.PI / 2) + 1) / 2 // 0 at midnight, 1 at noon

    const topDay = { r: 80, g: 140, b: 255 }
    const bottomDay = { r: 180, g: 220, b: 255 }
    const topNight = { r: 5, g: 20, b: 50 }
    const bottomNight = { r: 0, g: 0, b: 0 }

    const lerp = (a, b, f) => Math.round(a + (b - a) * f)
    const top = {
      r: lerp(topNight.r, topDay.r, dayFactor),
      g: lerp(topNight.g, topDay.g, dayFactor),
      b: lerp(topNight.b, topDay.b, dayFactor),
    }
    const bottom = {
      r: lerp(bottomNight.r, bottomDay.r, dayFactor),
      g: lerp(bottomNight.g, bottomDay.g, dayFactor),
      b: lerp(bottomNight.b, bottomDay.b, dayFactor),
    }

    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, `rgb(${top.r}, ${top.g}, ${top.b})`)
    grad.addColorStop(1, `rgb(${bottom.r}, ${bottom.g}, ${bottom.b})`)

    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    return dayFactor
  }, [])

  const drawStars = useCallback((ctx, w, h, dayFactor, t) => {
    if (!showStars) return
    const stars = starsRef.current
    const nightVisibility = Math.max(0, 1 - dayFactor * 1.2) // mostly hidden in the day
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < stars.length; i += 1) {
      const s = stars[i]
      // Slight drift
      s.x += s.sp * 0.5
      if (s.x > w + 5) s.x = -5
      const twinkle = 0.5 + 0.5 * Math.sin(t * 0.002 + s.tw)
      const alpha = nightVisibility * (0.3 + 0.7 * twinkle)
      if (alpha <= 0.01) continue
      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
    }
    ctx.restore()
  }, [showStars])

  const drawClouds = useCallback((ctx, w, h, dayFactor, dt) => {
    if (!showClouds) return
    const clouds = cloudsRef.current
    const visibility = 0.3 + 0.5 * dayFactor // more visible by day
    ctx.save()
    for (let i = 0; i < clouds.length; i += 1) {
      const c = clouds[i]
      c.x += c.vx * (dt / 1000)
      if (c.x - c.scale * 2 > w) {
        c.x = -c.scale * 2
        c.y = Math.random() * (h * 0.5)
      }
      const r = c.scale
      ctx.globalAlpha = c.alpha * visibility
      ctx.fillStyle = '#ffffff'
      // draw a few overlapping circles to make a cloudlet
      ctx.beginPath()
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2)
      ctx.arc(c.x + r * 0.8, c.y + r * 0.1, r * 0.9, 0, Math.PI * 2)
      ctx.arc(c.x - r * 0.7, c.y + r * 0.15, r * 0.7, 0, Math.PI * 2)
      ctx.arc(c.x + r * 0.2, c.y - r * 0.2, r * 0.6, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }, [showClouds])

  const drawDebugOverlay = useCallback((ctx, w, h) => {
    if (!debug) return
    ctx.save()
    const text = `alpha: ${fmt(alpha)}\nbeta: ${fmt(beta)}\ngamma: ${fmt(gamma)}\n${orientation}`
    const lines = text.split('\n')
    ctx.font = `${Math.max(10, Math.round(h * 0.03))}px monospace`
    ctx.textBaseline = 'top'
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    const pad = 8
    const lineH = Math.round(h * 0.04)
    const boxW = Math.max(...lines.map((l) => ctx.measureText(l).width)) + pad * 2
    const boxH = lineH * lines.length + pad * 2
    ctx.fillRect(pad, pad, boxW, boxH)
    ctx.fillStyle = '#00ff99'
    for (let i = 0; i < lines.length; i += 1) {
      ctx.fillText(lines[i], pad * 2, pad + i * lineH)
    }
    ctx.restore()
  }, [alpha, beta, gamma, debug, orientation])

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    const s = streamRef.current
    if (s) {
      s.getTracks().forEach((t) => {
        try { t.stop() } catch (_) {}
      })
      streamRef.current = null
    }
    setIsActive(false)
  }, [])

  const start = useCallback(async () => {
    if (isActive || isLoading) return
    setIsLoading(true)
    setError(null)
    try {
      if (!canvasRef.current) {
        const c = document.createElement('canvas')
        c.width = internalSize.w
        c.height = internalSize.h
        canvasRef.current = c
        initScene(Math.random)
      }
      const canvas = canvasRef.current
      // Prepare video element
      if (!videoRef.current) {
        const v = document.createElement('video')
        v.setAttribute('playsinline', '')
        v.muted = true
        videoRef.current = v
      }
      const stream = canvas.captureStream(frameRate)
      streamRef.current = stream
      const video = videoRef.current
      if ('srcObject' in video) video.srcObject = stream
      else video.src = window.URL.createObjectURL(stream)
      const playPromise = video.play()
      if (playPromise?.catch) playPromise.catch(() => {})

      // Start animation loop
      let last = performance.now()
      const ctx = canvas.getContext('2d')
      const draw = (now) => {
        const dt = now - last
        last = now
        const w = internalSize.w
        const h = internalSize.h
        const dayFactor = drawSkyGradient(ctx, w, h, now)
        drawStars(ctx, w, h, dayFactor, now)
        drawClouds(ctx, w, h, dayFactor, dt)
        drawDebugOverlay(ctx, w, h)
        rafRef.current = requestAnimationFrame(draw)
      }
      rafRef.current = requestAnimationFrame(draw)

      setIsActive(true)
    } catch (err) {
      setError({ message: err?.message, name: err?.name })
      setIsActive(false)
      stop()
    } finally {
      setIsLoading(false)
    }
  }, [drawClouds, drawDebugOverlay, drawSkyGradient, drawStars, frameRate, initScene, internalSize.h, internalSize.w, isActive, isLoading, stop])

  // Orientation changes for orientation state
  useEffect(() => {
    function handleOrientationChange() {
      setOrientation(getOrientation())
    }
    window.addEventListener('orientationchange', handleOrientationChange)
    window.addEventListener('resize', handleOrientationChange)
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange)
      window.removeEventListener('resize', handleOrientationChange)
    }
  }, [])

  // Auto-start on mount if requested
  useEffect(() => {
    if (autoStart) {
      start()
      return () => {
        stop()
      }
    }
    return undefined
  }, [autoStart, start, stop])

  const video = videoRef.current || null
  const stream = streamRef.current || null

  return {
    isLoading,
    isActive,
    error,
    orientation,
    video,
    stream,
    start,
    stop,
  }
}

function fmt(x) {
  if (x == null || Number.isNaN(x)) return '—'
  return `${Math.round(x * 10) / 10}`
}

function getOrientation() {
  if (typeof window === 'undefined') return 'landscape'
  const angle = getScreenOrientationAngle()
  const isPortrait = Math.abs(angle) === 90 ? false : true
  if (Number.isNaN(angle)) {
    return window.innerHeight >= window.innerWidth ? 'portrait' : 'landscape'
  }
  return isPortrait ? 'portrait' : 'landscape'
}

function getScreenOrientationAngle() {
  if (window.screen && window.screen.orientation && typeof window.screen.orientation.angle === 'number') {
    return window.screen.orientation.angle
  }
  if (typeof window.orientation === 'number') {
    return window.orientation
  }
  return NaN
}


