"use client"

import React from 'react'
import TargetReticle from '@/components/TargetReticle'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

/**
 * AROverlay
 * - Absolute, full-viewport overlay for AR UI
 * - Container uses pointer-events-none so it does not block interactions
 * - Interactive elements set pointer-events-auto
 * - Top bar: discovery count badge in a glass card
 * - Center: targeting reticle
 * - Bottom: scan button inside a glass card
 */
export default function AROverlay({ discoveries = 0, onScan, scanning = false, progress = 0 }) {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[2]"
      aria-live="polite"
      role="presentation"
    >
      {/* Top bar */}
      <div className="absolute left-3 right-3 top-3 flex justify-center text-md opacity-70 flex gap-2 rounded-md p-2 bg-primary backdrop-blur-md font-semibold text-white"><p>Discoveries:</p>
        <Badge className="bg-cosmic-blue-500/80 text-white border-transparent">{discoveries}</Badge>
      </div>


      {/* Center reticle */}
      <main className="absolute inset-0 flex items-center justify-center">
        <TargetReticle />
      </main>

      {/* Bottom CTA */}
      <div className="absolute left-0 right-0 bottom-4 flex justify-center pointer-events-auto w-full max-w-screen-sm px-3!">
        <Button className="px-8 w-full opacity-70 backdrop-blur-md" size="lg" onClick={onScan} disabled={scanning}>
          {scanning ? `Scanning… ${progress}%` : 'Scan for Exoplanets'}
        </Button>
      </div>
    </div>
  )
}


