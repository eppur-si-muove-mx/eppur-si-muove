"use client"

import { useCallback, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useDeviceOrientation } from '@/hooks/useDeviceOrientation'
import { useMockOrientation } from '@/utils/mockData/sensorSimulator'
import calculateSearchArea from '@/utils/searchArea'
import searchCelestialObjects, { type SearchResult } from '@/utils/data/spatialSearch'

type ScanState = 'idle' | 'scanning' | 'processing' | 'complete'

export function useScan() {
  // Sensors
  const geo = useGeolocation({ autoRequest: true, autoWatch: true, enableHighAccuracy: true })
  const device = useDeviceOrientation({ autoStart: false })
  const mock = useMockOrientation()

  const [state, setState] = useState<ScanState>('idle')
  const [results, setResults] = useState<SearchResult[]>([])

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

  const scanArea = useCallback(async () => {
    try {
      setState('scanning')
      toast.loading('Scanning...', { id: 'scan' })
      console.log('[SCAN] starting')

      const { alpha, beta, gamma } = orientation
      const { latitude, longitude } = getPosition()
      console.log('[SCAN] orientation', { alpha, beta, gamma, mock: orientation.mock })
      console.log('[SCAN] position', { latitude, longitude })

      if (!isFinite(alpha) || !isFinite(beta) || !isFinite(gamma)) {
        throw new Error('Orientation not available. Enable Motion access.')
      }
      if (!isFinite(latitude) || !isFinite(longitude)) {
        throw new Error('Location not available. Allow location access.')
      }

      const searchArea = calculateSearchArea(alpha, beta, gamma, latitude, longitude)
      console.log('[SCAN] searchArea', searchArea)

      setState('processing')
      // Simulate compute time 2-3s
      const delay = 2000 + Math.round(Math.random() * 1000)
      await new Promise((r) => setTimeout(r, delay))

      const found = searchCelestialObjects(searchArea, undefined, { alpha, beta })
      console.log('[SCAN] search results', found)
      setResults(found)
      setState('complete')

      if (found.length > 0) {
        toast.success(`Found ${found.length} objects!`, { id: 'scan' })
      } else {
        toast.message('No objects in this area', { id: 'scan' })
      }

      return found
    } catch (err: any) {
      console.error('[SCAN] failed', err)
      setState('idle')
      toast.error('Scan failed', { id: 'scan' })
      return [] as SearchResult[]
    }
  }, [getPosition, orientation])

  return {
    scanArea,
    state,
    results,
    sensors: {
      orientation,
      geolocation: { status: geo.status, latitude: geo.latitude, longitude: geo.longitude },
      startMotion: device.start,
    },
  }
}

export default useScan


