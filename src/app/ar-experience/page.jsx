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

export default function ARExperiencePage() {
  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)
  const cameraCtl = useRef({ start: () => {}, stop: () => {} })
  const [cameraActive, setCameraActive] = useState(false)
  const scan = useScan()
  const discovery = useDiscovery()
  const mock = useMockOrientation()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Space to trigger scan
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space') { e.preventDefault(); scan.scanArea() }
    }
    window.addEventListener('keydown', onKey, { passive: false })
    return () => window.removeEventListener('keydown', onKey)
  }, [scan.scanArea])

  return (
    <div style={{ position: 'relative', minHeight: '100vh', width: '100vw' }}>
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


      {/* iOS enable buttons moved into ARMotionOverlay */}
      {mock.enabled && mock.DebugPanel}
    </div>
  )
}


