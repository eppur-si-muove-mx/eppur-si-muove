"use client"

import Link from 'next/link'
import ARCameraView from '@/components/ARCameraView'
import AROverlay from '@/components/AROverlay'
import { useDeviceOrientation } from '@/hooks/useDeviceOrientation'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { useScan } from '@/components/ar/ScanHandler'
import { useDiscovery } from '@/contexts/DiscoveryContext'
import { useMockOrientation } from '@/utils/mockData/sensorSimulator'

export default function ARExperiencePage() {
  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)
  const cameraCtl = useRef({ start: () => {}, stop: () => {} })
  const motion = useDeviceOrientation({ autoStart: false })
  const scan = useScan()
  const discovery = useDiscovery()
  const mock = useMockOrientation()

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
            onClick={() => motion.start()}
            size="sm"
            className="opacity-60 backdrop-blur-md"
          >
            Enable Motion
          </Button>
        </div>
      </div>

      {mock.enabled && mock.DebugPanel}
    </div>
  )
}


