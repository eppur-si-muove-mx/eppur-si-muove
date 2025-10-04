"use client"

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { XIcon } from 'lucide-react'

export default function PlanetDetailOverlay({ open = false, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 backdrop-blur-sm" onClick={onClose} />

      <Card className="relative pointer-events-auto p-0 bg-transparent border-cyan-300 w-full m-2">
        <Button
          className="absolute right-3 top-3 z-10"
          variant="ghost"
          size="icon"
          onClick={onClose}
        >
          <XIcon className="size-6 text-blue-200" />
        </Button>
        <CardContent className="p-1 relative">
          <div className="absolute inset-0 bg-cyan-300 opacity-10"></div>
          <div className="flex flex-col p-2 gap-1 items-center opacity-100">
            <div className="flex items-center justify-center ">
                <img
                  src="/planets/planet-sample.png"
                  alt="Planeta descubierto"
                  className="block w-[240px] h-[240px] object-cover"
                />
            </div>

            <div className="flex flex-col gap-2 text-sm md:text-base text-blue-200 font-thin w-full">
              <div><span className="font-semibold">Radius:</span> 1.34 earth radius</div>
              <div><span className="font-semibold">Mass:</span> 2.36 earth masses</div>
              <div><span className="font-semibold">Orbital distance:</span> 0.409UA</div>
              <div><span className="font-semibold">Orbital period:</span> 112.3 earth days</div>
              <div><span className="font-semibold">Temperature:</span> 233K (-40°C)</div>
              <div><span className="font-semibold">Atmospheric composition:</span> H₂O, CO₂, CH₄ (metano)</div>
              <div><span className="font-semibold">Albedo:</span> 0.6</div>
              <div><span className="font-semibold">Density:</span> 4.8g/cm³</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


