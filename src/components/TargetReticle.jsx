"use client"

import React from 'react'

/**
 * TargetReticle
 * - Centered circular targeting reticle with pulsing animation
 * - SVG for crisp rendering and low overhead
 * - Semi-transparent white/blue strokes, central dot
 * - pointer-events: none so it won't block UI
 * - Responsive: size ~128-192px on mobile (smaller on very small widths)
 */
export default function TargetReticle({ size = 160, className = '' }) {
  const clamped = Math.max(100, Math.min(100, size))
  const r = clamped / 2
  const stroke = 2
  return (
    <div
      className={`pointer-events-none fixed inset-0 flex items-center justify-center ${className}`}
      aria-hidden="true"
    >
      <svg
        width={clamped}
        height={clamped}
        viewBox={`0 0 ${clamped} ${clamped}`}
        className="animate-pulse-slow"
      >
        {/* Outer circle */}
        <circle
          cx={r}
          cy={r}
          r={r - stroke}
          fill="none"
          stroke="oklch(80.9% 0.105 251.813)"
          strokeWidth={stroke}
        />

        {/* Center dot */}
        <circle cx={r} cy={r} r={3} fill="oklch(80.9% 0.105 251.813)" />
      </svg>
    </div>
  )
}


