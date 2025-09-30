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
  const clamped = Math.max(120, Math.min(220, size))
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
          stroke="rgba(255,255,255,0.35)"
          strokeWidth={stroke}
        />
        {/* Accent ring */}
        <circle
          cx={r}
          cy={r}
          r={r * 0.75}
          fill="none"
          stroke="rgba(37,99,235,0.35)"
          strokeWidth={1.5}
          strokeDasharray="6 8"
        />
        {/* Crosshair ticks */}
        {['top','right','bottom','left'].map((pos, i) => {
          const len = r * 0.16
          const mid = r
          const s = stroke
          let x1 = mid, y1 = s, x2 = mid, y2 = s + len
          if (pos === 'right') { x1 = clamped - s; y1 = mid; x2 = clamped - (s + len); y2 = mid }
          if (pos === 'bottom') { x1 = mid; y1 = clamped - s; x2 = mid; y2 = clamped - (s + len) }
          if (pos === 'left') { x1 = s; y1 = mid; x2 = s + len; y2 = mid }
          return (
            <line
              key={pos}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(255,255,255,0.6)"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          )
        })}
        {/* Center dot */}
        <circle cx={r} cy={r} r={3.5} fill="rgba(255,255,255,0.9)" />
      </svg>
    </div>
  )
}


