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
export default function AROverlay({ discoveries = 0, onScan }) {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[2]"
      aria-live="polite"
      role="presentation"
    >
      {/* Top bar */}
      <header className="absolute left-0 right-0 top-3 flex justify-center">
        <div className="pointer-events-auto w-full max-w-screen-sm px-3">
          <Card className="bg-background/80 backdrop-blur-md py-3">
            <CardContent className="flex items-center justify-between">
              <div className="text-sm opacity-80">Discoveries</div>
              <Badge className="bg-cosmic-blue-500/80 text-white border-transparent">{discoveries}</Badge>
            </CardContent>
          </Card>
        </div>
      </header>

      {/* Center reticle */}
      <main className="absolute inset-0 flex items-center justify-center">
        <TargetReticle />
      </main>

      {/* Bottom CTA */}
      <footer className="absolute left-0 right-0 bottom-4 flex justify-center">
        <div className="pointer-events-auto w-full max-w-screen-sm px-3">
          <Card className="bg-background/80 backdrop-blur-md">
            <CardContent className="py-3">
              <div className="flex justify-center">
                <Button className="px-10" size="lg" onClick={onScan}>Scan</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </footer>
    </div>
  )
}


