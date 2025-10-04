"use client"

import Link from 'next/link'
import ARCameraView from '@/components/ARCameraView'
import AROverlay from '@/components/AROverlay'
import ARStarRenderer from '@/components/ar/ARStarRenderer'
import ARCompassTest from '@/components/ar/ARCompassTest'
import { useEffect, useRef, useState } from 'react'
import { useScan } from '@/components/ar/ScanHandler'
import { useDiscovery } from '@/contexts/DiscoveryContext'
import { useMockOrientation } from '@/utils/mockData/sensorSimulator'
import { toast } from 'sonner'
import PlanetDetailOverlay from '@/components/PlanetDetailOverlay'

export default function ARExperiencePage() {
  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)
  const cameraCtl = useRef({ start: () => {}, stop: () => {} })
  const [cameraActive, setCameraActive] = useState(false)
  const scan = useScan()
  const discovery = useDiscovery()
  const mock = useMockOrientation()
  const [mounted, setMounted] = useState(false)
  const [planetOpen, setPlanetOpen] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Space to trigger scan
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space') { e.preventDefault(); scan.scanArea() }
    }
    window.addEventListener('keydown', onKey, { passive: false })
    return () => window.removeEventListener('keydown', onKey)
  }, [scan.scanArea])

  // Open planet detail when scan completes with results
  useEffect(() => {
    if ((scan.state === 'complete' || discovery.scanState === 'complete')) {
      const hasResults = (scan.results && scan.results.length) || (discovery.currentScanResults && discovery.currentScanResults.length)
      if (hasResults) setPlanetOpen(true)
    }
  }, [scan.state, discovery.scanState, scan.results, discovery.currentScanResults])

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
      <ARCameraView
        autoStart={false}
        facingMode="environment"
        zIndex={-1}
        onReady={(ctl) => {
          cameraCtl.current = ctl
          setCameraActive(ctl.isActive)
        }}
      />
      <ARCompassTest
        orientation={scan.sensors.orientation}
        onEnableCamera={async () => {
          await cameraCtl.current.start()
          setCameraActive(true)
        }}
        motionStatus={scan.sensors.motionStatus}
        cameraActive={cameraActive}
        onSearchNewHome={() => {
          const fakeResults = [
            {
              id: 'simulated-1',
              name: 'Mock Celestial Object',
              altitude: 42,
              azimuth: 135,
            },
          ]
          toast.success('Positive match! Found 1 object.', { id: 'scan' })
          try { navigator.vibrate?.([20, 30, 20]) } catch (_) {}
          discovery.setScanResults(fakeResults)
          discovery.updateScanState('complete')
        }}
      />
      {scan.ui.Overlay}
      <AROverlay
        discoveries={discovery.discoveryCount}
        onScan={async () => {
          const res = await scan.scanArea()
          if (res.length) console.log('[AR] found objects', res)
          discovery.setScanResults(res)
          discovery.updateScanState('complete')
        }}
        scanning={scan.state === 'scanning' || scan.state === 'processing'}
        progress={scan.ui.progress}
      />

      <PlanetDetailOverlay open={planetOpen} onClose={() => setPlanetOpen(false)} />


      {/* iOS enable buttons moved into ARMotionOverlay */}
      {mock.enabled && mock.DebugPanel}
    </div>
  )
}


