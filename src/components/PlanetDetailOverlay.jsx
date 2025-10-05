"use client"

import React, { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { XIcon, Send, FilePlus2, Users, Orbit } from 'lucide-react'
import { useDiscovery } from '@/contexts/DiscoveryContext'

export default function PlanetDetailOverlay({ open = false, onClose }) {
  const d = useDiscovery()
  const planet = d.getCurrentPlanet()
  const flags = useMemo(() => planet ? d.getFlags(planet.id_objeto) : { orbit: false, alien: false, heart: false }, [d, planet])
  if (!open || !planet) return null
  const name = planet.nickname || planet.id_objeto
  const orbitIconStyle = flags.orbit ? 'size-5 text-cyan-300' : 'size-5 text-blue-200'
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
        <Button
          className="absolute left-3 top-3 z-10"
          variant="ghost"
          size="icon"
          onClick={onClose}
        >
          <Users className="size-6 text-blue-200" />
        </Button>
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
          <div className="flex flex-col p-2 gap-1 items-center opacity-100 relative gap-4">
            <div className="text-blue-200 font-semibold text-lg">{name}</div>
            <div className="flex items-center justify-center ">
                <img
                  src={"/planets/planet-sample-01.png"}
                  alt="Planeta descubierto"
                  className="block w-[240px] h-[240px] object-cover"
                />
            </div>
            <div className="flex gap-2 items-center justify-start mr-auto">
              <Button variant="ghost" size="icon" className="relative" onClick={() => d.toggleFlag(planet.id_objeto, 'alien')} >
                <img src="/icons/icon-alien-unchecked.png" className="size-6" />
                <img src="/icons/icon-alien-active.png" className={`size-6 absolute ${flags.alien ? 'opacity-100' : 'opacity-0'}`} />
              </Button>
              <Button variant="ghost" size="icon" className="relative" onClick={() => d.toggleFlag(planet.id_objeto, 'heart')} >
                <img src="/icons/icon-heart-unchecked.png" className="size-6" />
                <img src="/icons/icon-like-active.png" className={`size-6 absolute ${flags.heart ? 'opacity-100' : 'opacity-0'}`} />
              </Button>
              <Button variant="ghost" size="icon" className="relative" onClick={() => d.toggleFlag(planet.id_objeto, 'orbit')} >
                <Orbit className={orbitIconStyle} />
              </Button>
              <Button variant="ghost" size="icon">
                <FilePlus2 className="size-5 text-blue-200" />
              </Button>
              <Button variant="ghost" size="icon">
                <Send className="size-5 text-blue-200" />
              </Button>
            </div>

            <div className="flex flex-col gap-2 text-sm md:text-base text-blue-200 font-thin w-full max-h-[230px] overflow-y-auto overflow-x-hidden">
              <div><span className="font-semibold">Disposition:</span> {planet.disposicion}</div>
              <div><span className="font-semibold">Planet radius:</span> {planet.radio_planeta}</div>
              <div><span className="font-semibold">Planet temp:</span> {planet.temp_planet} K</div>
              <div><span className="font-semibold">Orbit period:</span> {planet.periodo_orbit} days</div>
              <div><span className="font-semibold">Star temp:</span> {planet.temp_estrella} K</div>
              <div><span className="font-semibold">Star radius:</span> {planet.radio_estrella}</div>
              <div><span className="font-semibold">RA:</span> {planet.RA}</div>
              <div><span className="font-semibold">DEC:</span> {planet.DEC}</div>
              <div><span className="font-semibold">Distance:</span> {planet.dist} ly</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


