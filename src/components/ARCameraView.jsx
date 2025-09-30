"use client"

import { useEffect, useMemo, useRef } from 'react'
import { useCamera } from '@/hooks/useCamera'

/**
 * ARCameraView
 * - Uses `useCamera` to obtain a MediaStream
 * - Renders a full-viewport background video (absolute positioned)
 * - Maintains aspect ratio using object-fit: cover
 * - Listens to orientation changes via the hook (no manual rotation needed)
 * - HTML5 <video> for now; can be swapped for Three.js texture later
 */
export default function ARCameraView(props) {
  const {
    autoStart = false,
    facingMode = 'environment',
    frameRate = 30,
    className,
    style,
    zIndex = -1, // behind content by default
  } = props || {}

  const {
    stream,
    start,
    stop,
    isActive,
    isLoading,
    error,
    orientation, // 'portrait' | 'landscape'
  } = useCamera({ facingMode, frameRate, autoStart })

  const videoRef = useRef(null)

  // Bind MediaStream to the <video> and play
  useEffect(() => {
    const video = videoRef.current
    if (!video || !stream) return
    try {
      video.srcObject = stream
    } catch (_) {
      // Older fallback
      // eslint-disable-next-line no-unused-expressions
      video.src = video.src || ''
    }
    const playPromise = video.play()
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {})
    }
  }, [stream])

  // If caller opted into autoStart, start/stop with mount lifecycle
  useEffect(() => {
    if (!autoStart) return undefined
    start()
    return () => {
      stop()
    }
  }, [autoStart, start, stop])

  // Styles for full-viewport background
  const containerStyle = useMemo(() => ({
    position: 'absolute',
    inset: 0,
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    zIndex,
    pointerEvents: 'none', // let UI above receive touches
    ...style,
  }), [style, zIndex])

  const videoStyle = useMemo(() => ({
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
    transform: 'translateZ(0)',
  }), [])

  return (
    <div className={className} style={containerStyle} aria-live="polite">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={videoStyle}
      />
      {/* Keep minimal semantics for screen readers; avoid overlay UI here */}
    </div>
  )
}


