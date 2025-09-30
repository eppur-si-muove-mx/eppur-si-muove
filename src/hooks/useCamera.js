import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * useCamera
 *
 * A React hook that:
 * - Requests camera permissions using navigator.mediaDevices.getUserMedia
 * - Returns a video stream that can be used as a texture in Three.js
 * - Handles permission denied states and other errors
 * - Handles device rotation (portrait/landscape)
 * - Provides methods to start/stop the camera
 * - Returns camera state (loading, active, error, etc.)
 */
export function useCamera(options = {}) {
  const {
    facingMode = 'environment', // 'user' | 'environment'
    width,
    height,
    frameRate,
    deviceId,
    // Whether to automatically start on mount
    autoStart = false,
  } = options

  const [isLoading, setIsLoading] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState(null)
  const [orientation, setOrientation] = useState(getOrientation())

  const mediaStreamRef = useRef(null)
  const videoRef = useRef(null)

  // Compute constraints only when inputs change
  const constraints = useMemo(() => {
    const videoConstraints = {}
    if (typeof facingMode !== 'undefined') videoConstraints.facingMode = facingMode
    if (typeof deviceId !== 'undefined') videoConstraints.deviceId = { exact: deviceId }
    if (typeof width !== 'undefined') videoConstraints.width = { ideal: width }
    if (typeof height !== 'undefined') videoConstraints.height = { ideal: height }
    if (typeof frameRate !== 'undefined') videoConstraints.frameRate = { ideal: frameRate }
    return { audio: false, video: videoConstraints }
  }, [deviceId, facingMode, frameRate, height, width])

  const stopTracks = useCallback(() => {
    const stream = mediaStreamRef.current
    if (stream) {
      stream.getTracks().forEach((t) => {
        try { t.stop() } catch (_) {}
      })
      mediaStreamRef.current = null
    }
  }, [])

  const attachToVideo = useCallback((stream) => {
    if (!videoRef.current) {
      videoRef.current = document.createElement('video')
      videoRef.current.setAttribute('playsinline', '')
      videoRef.current.muted = true
    }
    const video = videoRef.current
    if ('srcObject' in video) {
      video.srcObject = stream
    } else {
      // Older browsers fallback
      video.src = window.URL.createObjectURL(stream)
    }
    // Autoplay; callers can also use the element directly if needed
    const playPromise = video.play()
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {})
    }
  }, [])

  const start = useCallback(async () => {
    if (isActive || isLoading) return
    setIsLoading(true)
    setError(null)
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API not supported')
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      mediaStreamRef.current = stream
      attachToVideo(stream)
      setIsActive(true)
    } catch (err) {
      // Normalize PermissionDeniedError name differences across browsers
      const name = err && (err.name || err.code)
      let normalizedMessage = err?.message || 'Unknown camera error'
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        normalizedMessage = 'Camera permission denied'
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        normalizedMessage = 'Requested camera not found or constraints not satisfied'
      } else if (name === 'NotReadableError') {
        normalizedMessage = 'Camera is already in use'
      }
      setError({ name, message: normalizedMessage, original: err })
      setIsActive(false)
      stopTracks()
    } finally {
      setIsLoading(false)
    }
  }, [attachToVideo, constraints, isActive, isLoading, stopTracks])

  const stop = useCallback(() => {
    stopTracks()
    setIsActive(false)
  }, [stopTracks])

  // Orientation handling
  useEffect(() => {
    function handleOrientationChange() {
      setOrientation(getOrientation())
    }

    // Different browsers may support one or both
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

  // Provide data useful for Three.js video texture
  const video = videoRef.current || null
  const stream = mediaStreamRef.current || null

  return {
    // state
    isLoading,
    isActive,
    error,
    orientation, // 'portrait' | 'landscape'

    // media
    video, // HTMLVideoElement to feed into THREE.VideoTexture
    stream, // MediaStream if needed by the caller

    // controls
    start,
    stop,
  }
}

function getOrientation() {
  if (typeof window === 'undefined') return 'landscape'
  const angle = getScreenOrientationAngle()
  const isPortrait = Math.abs(angle) === 90 ? false : true
  // Fallback based on viewport when orientation is unavailable
  if (Number.isNaN(angle)) {
    return window.innerHeight >= window.innerWidth ? 'portrait' : 'landscape'
  }
  return isPortrait ? 'portrait' : 'landscape'
}

function getScreenOrientationAngle() {
  // Prefer ScreenOrientation API
  if (window.screen && window.screen.orientation && typeof window.screen.orientation.angle === 'number') {
    return window.screen.orientation.angle
  }
  // Fallback to window.orientation (deprecated but still present on some browsers)
  if (typeof window.orientation === 'number') {
    return window.orientation
  }
  return NaN
}


