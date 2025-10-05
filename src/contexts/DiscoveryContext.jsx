"use client"

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

export const ScanState = {
  idle: 'idle',
  scanning: 'scanning',
  processing: 'processing',
  complete: 'complete',
}

const DiscoveryContext = createContext(null)

export function DiscoveryProvider({ children }) {
  const [currentScanResults, setCurrentScanResults] = useState([])
  const [scanState, setScanState] = useState(ScanState.idle)
  const [scanCounter, setScanCounter] = useState(0)
  const [discoveries, setDiscoveries] = useState([])

  // Demo data: 10 mock planets (re-using the single available image)
  const [mockPlanets] = useState([
    { id_objeto: 'BD+20 594 b', disposicion: 'CONFIRMED', radio_planeta: 13.54, temp_planet: 1020.0, periodo_orbit: 41.685, temp_estrella: 6140.0, radio_estrella: 3.1675, RA: 181.59369, DEC: -4.9467, dist: 485.735, path_to_image: '/planets/planet-sample-1.png', nickname: 'planetito' },
    { id_objeto: 'Kepler-22 b', disposicion: 'CONFIRMED', radio_planeta: 2.4, temp_planet: 295.0, periodo_orbit: 289.9, temp_estrella: 5518, radio_estrella: 0.979, RA: 285.679, DEC: 47.898, dist: 195, path_to_image: '/planets/planet-sample-2.png', nickname: 'Kepler-22 b' },
    { id_objeto: 'HD 209458 b', disposicion: 'CONFIRMED', radio_planeta: 13.5, temp_planet: 1350, periodo_orbit: 3.5247, temp_estrella: 6071, radio_estrella: 1.2, RA: 330.794, DEC: 18.883, dist: 159, path_to_image: '/planets/planet-sample-3.png', nickname: 'Osiris' },
    { id_objeto: 'WASP-12 b', disposicion: 'CONFIRMED', radio_planeta: 18.0, temp_planet: 2500, periodo_orbit: 1.0914, temp_estrella: 6300, radio_estrella: 1.6, RA: 67.421, DEC: 29.673, dist: 427, path_to_image: '/planets/planet-sample-4.png', nickname: 'WASP-12 b' },
    { id_objeto: 'TRAPPIST-1 d', disposicion: 'CONFIRMED', radio_planeta: 0.772, temp_planet: 288, periodo_orbit: 4.05, temp_estrella: 2550, radio_estrella: 0.121, RA: 346.622, DEC: -5.041, dist: 39.6, path_to_image: '/planets/planet-sample-5.png', nickname: 'TRAPPIST-1 d' },
    { id_objeto: 'GJ 1214 b', disposicion: 'CONFIRMED', radio_planeta: 2.85, temp_planet: 393, periodo_orbit: 1.5804, temp_estrella: 3026, radio_estrella: 0.216, RA: 258.83, DEC: 4.89, dist: 47.5, path_to_image: '/planets/planet-sample-6.png', nickname: 'GJ 1214 b' },
    { id_objeto: 'Kepler-452 b', disposicion: 'CONFIRMED', radio_planeta: 1.63, temp_planet: 265, periodo_orbit: 384.8, temp_estrella: 5757, radio_estrella: 1.11, RA: 283.23, DEC: 44.5, dist: 1400, path_to_image: '/planets/planet-sample-7.png', nickname: 'Earth cousin' },
    { id_objeto: 'HD 189733 b', disposicion: 'CONFIRMED', radio_planeta: 13.9, temp_planet: 1200, periodo_orbit: 2.2186, temp_estrella: 4875, radio_estrella: 0.76, RA: 300.183, DEC: 22.709, dist: 64.5, path_to_image: '/planets/planet-sample-8.png', nickname: 'Azure' },
    { id_objeto: 'Kepler-16 b', disposicion: 'CONFIRMED', radio_planeta: 8.4, temp_planet: 188, periodo_orbit: 228.8, temp_estrella: 4450, radio_estrella: 0.65, RA: 289.775, DEC: 51.757, dist: 200, path_to_image: '/planets/planet-sample-9.png', nickname: 'Tatooine' },
    { id_objeto: 'Proxima b', disposicion: 'CONFIRMED', radio_planeta: 1.1, temp_planet: 234, periodo_orbit: 11.186, temp_estrella: 3042, radio_estrella: 0.154, RA: 217.4292, DEC: -62.6795, dist: 4.25, path_to_image: '/planets/planet-sample-10.png', nickname: 'Proxima b' },
  ])

  const [mockIndex, setMockIndex] = useState(0)
  const [discoveredPlanets, setDiscoveredPlanets] = useState([])
  const [currentPlanetId, setCurrentPlanetId] = useState(null)
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [flagsById, setFlagsById] = useState({})

  const setScanResults = useCallback((objects) => {
    setCurrentScanResults(objects)
  }, [])

  const addDiscovery = useCallback((object) => {
    setDiscoveries((prev) => prev.concat([{ id: object?.id_objeto || crypto.randomUUID(), object, createdAt: Date.now() }]))
  }, [])

  const clearScanResults = useCallback(() => {
    setCurrentScanResults([])
  }, [])

  const updateScanState = useCallback((state) => {
    setScanState(state)
    setScanCounter((n) => n + (state === ScanState.complete ? 1 : 0))
  }, [])

  const getFlags = useCallback((id) => {
    return flagsById[id] ?? { orbit: false, alien: false, heart: false }
  }, [flagsById])

  const setFlag = useCallback((id, flag, value) => {
    setFlagsById((prev) => ({ ...prev, [id]: { ...getFlags(id), [flag]: value } }))
  }, [getFlags])

  const toggleFlag = useCallback((id, flag) => {
    const current = getFlags(id)
    setFlag(id, flag, !current[flag])
  }, [getFlags, setFlag])

  const getCurrentPlanet = useCallback(() => {
    if (!currentPlanetId) return null
    return discoveredPlanets.find(p => p.id_objeto === currentPlanetId) ?? null
  }, [currentPlanetId, discoveredPlanets])

  const openPlanet = useCallback((id) => {
    setCurrentPlanetId(id)
    setOverlayOpen(true)
  }, [])

  const closeOverlay = useCallback(() => {
    setOverlayOpen(false)
  }, [])

  const nextMockScan = useCallback(() => {
    if (mockIndex >= mockPlanets.length) return null
    const planet = mockPlanets[mockIndex]
    setMockIndex(i => i + 1)
    setDiscoveredPlanets((prev) => prev.some(p => p.id_objeto === planet.id_objeto) ? prev : prev.concat([planet]))
    setCurrentPlanetId(planet.id_objeto)
    setOverlayOpen(true)
    return planet
  }, [mockIndex, mockPlanets])

  const followedAliens = useMemo(() => {
    return discoveredPlanets.filter(p => {
      const f = flagsById[p.id_objeto]
      return f?.orbit && f?.alien
    })
  }, [discoveredPlanets, flagsById])

  const followedHearts = useMemo(() => {
    return discoveredPlanets.filter(p => {
      const f = flagsById[p.id_objeto]
      return f?.orbit && f?.heart
    })
  }, [discoveredPlanets, flagsById])

  const followedAll = useMemo(() => {
    return discoveredPlanets.filter(p => {
      const f = flagsById[p.id_objeto]
      return !!f?.orbit
    })
  }, [discoveredPlanets, flagsById])

  const value = useMemo(() => ({
    currentScanResults,
    discoveries,
    scanState,
    discoveryCount: discoveries.length,
    scanCounter,
    setScanResults,
    addDiscovery,
    clearScanResults,
    updateScanState,

    mockPlanets,
    discoveredPlanets,
    currentPlanetId,
    overlayOpen,
    flagsById,

    nextMockScan,
    getCurrentPlanet,
    getFlags,
    setFlag,
    toggleFlag,
    openPlanet,
    closeOverlay,

    followedAliens,
    followedHearts,
    followedAll,
  }), [addDiscovery, clearScanResults, currentScanResults, discoveries, scanCounter, scanState, setScanResults, updateScanState, mockPlanets, discoveredPlanets, currentPlanetId, overlayOpen, flagsById, nextMockScan, getCurrentPlanet, getFlags, setFlag, toggleFlag, openPlanet, closeOverlay, followedAliens, followedHearts, followedAll])

  return (
    <DiscoveryContext.Provider value={value}>{children}</DiscoveryContext.Provider>
  )
}

export function useDiscovery() {
  const ctx = useContext(DiscoveryContext)
  if (!ctx) throw new Error('useDiscovery must be used within DiscoveryProvider')
  return ctx
}

export default DiscoveryProvider


