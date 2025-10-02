"use client"

import Link from 'next/link'
import ARCameraView from '@/components/ARCameraView'
import AROverlay from '@/components/AROverlay'
import ARStarRenderer from '@/components/ar/ARStarRenderer'
import ARCompassTest from '@/components/ar/ARCompassTest'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useScan } from '@/components/ar/ScanHandler'
import { useDiscovery } from '@/contexts/DiscoveryContext'
import { useMockOrientation } from '@/utils/mockData/sensorSimulator'

export default function ARExperiencePage() {
  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)
  const cameraCtl = useRef({ start: () => {}, stop: () => {} })
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
        onReady={(ctl) => { cameraCtl.current = ctl }}
      />
      <ARCompassTest orientation={scan.sensors.orientation} />
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


      {/* iOS enable buttons - visible when camera not active */}
      <div className="fixed bottom-18 left-0 right-0 z-[3] flex justify-center pointer-events-none">
        <div className="flex gap-3 pointer-events-auto">
          <Button
            onClick={() => cameraCtl.current.start()}
            size="sm"
            className="opacity-60 backdrop-blur-md"
          >
            Enable Camera
          </Button>
          <Button
            onClick={() => scan.sensors.startMotion?.()}
            size="sm"
            className="opacity-60 backdrop-blur-md"
          >
            {scan.sensors.motionStatus === 'active' ? 'Motion Enabled' : 'Enable Motion'}
          </Button>
        </div>
      </div>

      {/* Motion status chip (render after mount to avoid hydration mismatch) */}
      {mounted && (
        <div className="fixed top-3 right-3 z-[3] pointer-events-none">
          <span className={`pointer-events-auto rounded-md border px-2 py-1 text-xs backdrop-blur-md ${scan.sensors.motionStatus === 'active' ? 'bg-green-500/70 text-white' : scan.sensors.motionStatus === 'denied' ? 'bg-red-500/70 text-white' : 'bg-white/60'}`}>
            Motion: {scan.sensors.motionStatus}
          </span>
        </div>
      )}

      {mock.enabled && mock.DebugPanel}
    </div>
  )
}


