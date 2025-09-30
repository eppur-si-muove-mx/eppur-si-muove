"use client"

import Link from 'next/link'
import ARCameraView from '@/components/ARCameraView'
import AROverlay from '@/components/AROverlay'
import { useDeviceOrientation } from '@/hooks/useDeviceOrientation'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'

export default function ARExperiencePage() {
  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)
  const cameraCtl = useRef({ start: () => {}, stop: () => {} })
  const motion = useDeviceOrientation({ autoStart: false })

  return (
    <div style={{ position: 'relative', minHeight: '100vh', width: '100vw' }}>
      <ARCameraView
        autoStart={false}
        facingMode="environment"
        zIndex={-1}
        onReady={(ctl) => { cameraCtl.current = ctl }}
      />
      <AROverlay discoveries={0} onScan={() => {}} />


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
    </div>
  )
}


