import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * useGeolocation
 *
 * A React hook that:
 * - Requests location permission
 * - Gets current GPS coordinates (latitude, longitude)
 * - Continuously updates position with watchPosition
 * - Returns current coordinates, accuracy, and timestamp
 * - Handles permission denied and other error states
 * - Exposes location state: loading | granted | denied | error
 */
export function useGeolocation(options = {}) {
  const {
    enableHighAccuracy = true,
    maximumAge = 0,
    timeout = 10000,
    autoRequest = false,
    autoWatch = false,
  } = options

  const geolocationAvailable = typeof window !== 'undefined' && !!navigator?.geolocation

  const geoOptions = useMemo(() => ({ enableHighAccuracy, maximumAge, timeout }), [enableHighAccuracy, maximumAge, timeout])

  const [status, setStatus] = useState(geolocationAvailable ? 'idle' : 'error') // idle | loading | granted | denied | error
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [position, setPosition] = useState(null)

  const watchIdRef = useRef(null)
  const permissionStatusRef = useRef(null)

  const mapPermissionToStatus = useCallback((permissionState) => {
    if (permissionState === 'granted') return 'granted'
    if (permissionState === 'denied') return 'denied'
    return 'idle'
  }, [])

  // Listen to permission changes when supported
  useEffect(() => {
    let cancelled = false
    async function setupPermissionListener() {
      try {
        if (!('permissions' in navigator) || !navigator.permissions?.query) return
        const perm = await navigator.permissions.query({ name: 'geolocation' })
        if (cancelled) return
        permissionStatusRef.current = perm
        setStatus((prev) => (prev === 'idle' ? mapPermissionToStatus(perm.state) : prev))
        const onChange = () => {
          setStatus(mapPermissionToStatus(perm.state))
        }
        perm.onchange = onChange
      } catch (_) {
        // Some browsers (Safari) don't support Permissions API for geolocation
      }
    }
    setupPermissionListener()
    return () => {
      cancelled = true
      if (permissionStatusRef.current) permissionStatusRef.current.onchange = null
    }
  }, [mapPermissionToStatus])

  const handlePositionSuccess = useCallback((pos) => {
    const { coords, timestamp } = pos
    setPosition({
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      altitude: coords.altitude,
      altitudeAccuracy: coords.altitudeAccuracy,
      heading: coords.heading,
      speed: coords.speed,
      timestamp,
    })
    setStatus('granted')
    setError(null)
  }, [])

  const handlePositionError = useCallback((err) => {
    const isDenied = err?.code === 1 || err?.message?.toLowerCase().includes('denied')
    setStatus(isDenied ? 'denied' : 'error')
    setError({ name: err?.name, code: err?.code, message: err?.message })
  }, [])

  const requestPermission = useCallback(async () => {
    if (!geolocationAvailable) {
      setStatus('error')
      setError({ message: 'Geolocation API not supported' })
      return
    }
    setIsLoading(true)
    setStatus('loading')
    try {
      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, geoOptions)
      }).then((pos) => {
        handlePositionSuccess(pos)
      })
    } catch (err) {
      handlePositionError(err)
    } finally {
      setIsLoading(false)
    }
  }, [geolocationAvailable, geoOptions, handlePositionError, handlePositionSuccess])

  const refresh = useCallback(async () => {
    if (!geolocationAvailable) return
    setIsLoading(true)
    try {
      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, geoOptions)
      }).then((pos) => {
        handlePositionSuccess(pos)
      })
    } catch (err) {
      handlePositionError(err)
    } finally {
      setIsLoading(false)
    }
  }, [geolocationAvailable, geoOptions, handlePositionError, handlePositionSuccess])

  const startWatch = useCallback(() => {
    if (!geolocationAvailable) {
      setStatus('error')
      setError({ message: 'Geolocation API not supported' })
      return
    }
    if (watchIdRef.current !== null) return
    try {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          handlePositionSuccess(pos)
        },
        (err) => {
          handlePositionError(err)
        },
        geoOptions
      )
      watchIdRef.current = id
    } catch (err) {
      handlePositionError(err)
    }
  }, [geolocationAvailable, geoOptions, handlePositionError, handlePositionSuccess])

  const stopWatch = useCallback(() => {
    if (!geolocationAvailable) return
    if (watchIdRef.current !== null) {
      try { navigator.geolocation.clearWatch(watchIdRef.current) } catch (_) {}
      watchIdRef.current = null
    }
  }, [geolocationAvailable])

  // Auto flows
  useEffect(() => {
    if (!geolocationAvailable) return
    let cancelled = false
    ;(async () => {
      if (autoRequest) {
        await requestPermission()
      }
      if (!cancelled && autoWatch) {
        startWatch()
      }
    })()
    return () => {
      cancelled = true
      stopWatch()
    }
  }, [autoRequest, autoWatch, geolocationAvailable, requestPermission, startWatch, stopWatch])

  return {
    // state
    isLoading,
    status, // idle | loading | granted | denied | error
    error,

    // position
    latitude: position?.latitude ?? null,
    longitude: position?.longitude ?? null,
    accuracy: position?.accuracy ?? null,
    coords: position, // includes altitude, heading, speed, timestamp
    timestamp: position?.timestamp ?? null,

    // controls
    requestPermission,
    refresh,
    startWatch,
    stopWatch,
  }
}


