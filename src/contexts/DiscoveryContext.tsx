"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { SearchResult } from '@/utils/data/spatialSearch'

export type ScanState = 'idle' | 'scanning' | 'processing' | 'complete'

type Discovery = {
  id: string
  createdAt: number
  object: any
}

type DiscoveryContextValue = {
  currentScanResults: SearchResult[]
  discoveries: Discovery[]
  scanState: ScanState
  discoveryCount: number
  scanCounter: number

  setScanResults: (objects: SearchResult[]) => void
  addDiscovery: (object: any) => void
  clearScanResults: () => void
  updateScanState: (state: ScanState) => void
}

const DiscoveryContext = createContext<DiscoveryContextValue | null>(null)

export function DiscoveryProvider({ children }: { children: React.ReactNode }) {
  const [currentScanResults, setCurrentScanResults] = useState<SearchResult[]>([])
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [scanCounter, setScanCounter] = useState<number>(0)
  const [discoveries, setDiscoveries] = useState<Discovery[]>([])

  // Load from localStorage once
  useEffect(() => {
    try {
      const blob = localStorage.getItem('discoveries')
      if (blob) setDiscoveries(JSON.parse(blob))
    } catch (_) {}
  }, [])

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('discoveries', JSON.stringify(discoveries))
    } catch (_) {}
  }, [discoveries])

  const setScanResults = useCallback((objects: SearchResult[]) => {
    setCurrentScanResults(objects)
  }, [])

  const addDiscovery = useCallback((object: any) => {
    setDiscoveries((prev) => prev.concat([{ id: object?.id_objeto || crypto.randomUUID(), object, createdAt: Date.now() }]))
  }, [])

  const clearScanResults = useCallback(() => {
    setCurrentScanResults([])
  }, [])

  const updateScanState = useCallback((state: ScanState) => {
    setScanState(state)
    setScanCounter((n) => n + (state === 'complete' ? 1 : 0))
  }, [])

  const value = useMemo<DiscoveryContextValue>(() => ({
    currentScanResults,
    discoveries,
    scanState,
    discoveryCount: discoveries.length,
    scanCounter,
    setScanResults,
    addDiscovery,
    clearScanResults,
    updateScanState,
  }), [addDiscovery, clearScanResults, currentScanResults, discoveries, scanCounter, scanState, setScanResults, updateScanState])

  return (
    <DiscoveryContext.Provider value={value}>{children}</DiscoveryContext.Provider>
  )
}

export function useDiscovery(): DiscoveryContextValue {
  const ctx = useContext(DiscoveryContext)
  if (!ctx) throw new Error('useDiscovery must be used within DiscoveryProvider')
  return ctx
}

export default DiscoveryProvider


