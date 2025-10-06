"use client"

import React, { useEffect, useState } from 'react'

export default function SimulatedBadge({ active }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    setVisible(!!active)
  }, [active])
  if (!visible) return null
  return (
    <div className="pointer-events-none fixed left-2 bottom-2 z-[3]">
      <div className="pointer-events-auto rounded-md bg-cosmic-blue-500/80 text-white px-2 py-1 text-xs shadow backdrop-blur-sm">
        Simulated Sky
      </div>
    </div>
  )
}


