/**
 * Spatial search over celestial dataset within an Alt/Az-derived RA/Dec area.
 */

import type { CelestialObject } from '@/utils/data/celestialDataManager'
import { CelestialDataManager } from '@/utils/data/celestialDataManager'
import type { SearchBoundary } from '@/utils/searchArea'
import { degToRad, radToDeg, wrapDegrees } from '@/utils/celestialCoordinates'

export type SearchResult = {
  object: CelestialObject
  distanceDeg: number
  bearingDeg: number // initial great-circle bearing from center to object
}

function raHoursToDeg(hours: number): number { return hours * 15 }

function angularSeparationDeg(ra1Deg: number, dec1Deg: number, ra2Deg: number, dec2Deg: number): number {
  const φ1 = degToRad(dec1Deg)
  const φ2 = degToRad(dec2Deg)
  const Δλ = degToRad(wrapDegrees(ra2Deg - ra1Deg))
  const cosd = Math.sin(φ1) * Math.sin(φ2) + Math.cos(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  const d = Math.acos(Math.max(-1, Math.min(1, cosd)))
  return radToDeg(d)
}

function initialBearingDeg(ra1Deg: number, dec1Deg: number, ra2Deg: number, dec2Deg: number): number {
  // Bearing on the sphere with Dec as latitude and RA as longitude
  const φ1 = degToRad(dec1Deg)
  const φ2 = degToRad(dec2Deg)
  const λ1 = degToRad(ra1Deg)
  const λ2 = degToRad(ra2Deg)
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1)
  const θ = Math.atan2(y, x)
  return wrapDegrees(radToDeg(θ))
}

type PredictOpts = { alpha?: number; beta?: number }

export function searchCelestialObjects(searchArea: SearchBoundary, dataset?: CelestialObject[], opts?: PredictOpts): SearchResult[] {
  const centerRAdeg = raHoursToDeg(searchArea.centerRA)
  const centerDec = searchArea.centerDec
  const minRADeg = raHoursToDeg(searchArea.minRA)
  const maxRADeg = raHoursToDeg(searchArea.maxRA)
  const minDec = searchArea.minDec
  const maxDec = searchArea.maxDec

  // Prepare RA segments accounting for wrap-around
  const segments: Array<{ min: number; max: number }> =
    minRADeg <= maxRADeg ? [{ min: minRADeg, max: maxRADeg }] : [{ min: minRADeg, max: 360 }, { min: 0, max: maxRADeg }]

  const source = dataset ?? CelestialDataManager.getAllObjects()

  // Debug logging for testing
  // eslint-disable-next-line no-console
  console.log('[SpatialSearch] bounds RA(deg):', { minRADeg, maxRADeg }, 'Dec:', { minDec, maxDec })

  let results: SearchResult[] = []
  for (const obj of source) {
    const ra = wrapDegrees(obj.Loc1_RA)
    const dec = obj.Loc2_DEC
    if (dec < minDec || dec > maxDec) continue
    // RA in any segment
    let inRA = false
    for (const seg of segments) {
      if (ra >= seg.min && ra <= seg.max) { inRA = true; break }
    }
    if (!inRA) continue

    const distanceDeg = angularSeparationDeg(centerRAdeg, centerDec, ra, dec)
    const bearingDeg = initialBearingDeg(centerRAdeg, centerDec, ra, dec)
    results.push({ object: obj, distanceDeg, bearingDeg })
  }

  results.sort((a, b) => a.distanceDeg - b.distanceDeg)

  // eslint-disable-next-line no-console
  console.log(`[SpatialSearch] Found ${results.length} objects in search area`)

  // ---------------------
  // Predictable DEBUG mode
  // ---------------------
  const predictable =
    (typeof process !== 'undefined' && (process.env.PREDICTABLE_SEARCH === 'true' || process.env.NEXT_PUBLIC_PREDICTABLE_SEARCH === 'true')) ||
    (typeof window !== 'undefined' && ((window as any).__PREDICTABLE_SEARCH === true))

  if (!predictable) return results

  const alpha = opts?.alpha ?? 0
  const beta = opts?.beta ?? 0
  const direction = humanDirection(alpha, beta)
  // eslint-disable-next-line no-console
  console.log(`DEBUG: Returning predictable results for ${direction}`)

  // Lucky mode: every 3rd scan guarantees something
  let count = 0
  if (typeof window !== 'undefined') {
    const w = window as any
    w.__SCAN_COUNT = (w.__SCAN_COUNT || 0) + 1
    count = w.__SCAN_COUNT
  } else {
    // module-scoped fallback
    ;(globalThis as any).__SCAN_COUNT = ((globalThis as any).__SCAN_COUNT || 0) + 1
    count = (globalThis as any).__SCAN_COUNT
  }

  const ensureAtLeast = (n: number) => {
    if (results.length >= n) return
    // augment from nearest overall
    const augmented = augmentFromDataset(centerRAdeg, centerDec, source, results, n)
    results = augmented
  }

  switch (direction) {
    case 'Up': {
      // exactly 1, prefer confirmed
      const confirmed = results.filter(r => r.object.disposicion === 'Planeta Confirmado')
      if (confirmed.length > 0) results = [confirmed[0]]
      else results = augmentFromDataset(centerRAdeg, centerDec, source, [], 1, 'Planeta Confirmado')
      break
    }
    case 'North': {
      ensureAtLeast(3)
      results = results.slice(0, 3)
      break
    }
    case 'South': {
      const cand = results.find(r => r.object.disposicion === 'Candidato')
      if (cand) results = [cand]
      else results = augmentFromDataset(centerRAdeg, centerDec, source, [], 1, 'Candidato')
      break
    }
    case 'East': {
      results = []
      break
    }
    case 'West': {
      ensureAtLeast(5)
      results = results.slice(0, 5)
      break
    }
  }

  // Lucky mode trigger
  if (count % 3 === 0 && results.length === 0) {
    results = augmentFromDataset(centerRAdeg, centerDec, source, [], 1)
  }

  return results
}

export default searchCelestialObjects

function humanDirection(alpha: number, beta: number): 'North' | 'East' | 'South' | 'West' | 'Up' {
  if (beta > 60) return 'Up'
  const a = ((alpha % 360) + 360) % 360
  if (a >= 315 || a < 45) return 'North'
  if (a >= 45 && a < 135) return 'East'
  if (a >= 135 && a < 225) return 'South'
  return 'West'
}

function augmentFromDataset(centerRAdeg: number, centerDec: number, dataset: CelestialObject[], seed: SearchResult[], n: number, requiredType?: CelestialObject['disposicion']): SearchResult[] {
  const existingIds = new Set(seed.map(r => r.object.id_objeto))
  const scored: SearchResult[] = []
  for (const obj of dataset) {
    if (existingIds.has(obj.id_objeto)) continue
    if (requiredType && obj.disposicion !== requiredType) continue
    const d = angularSeparationDeg(centerRAdeg, centerDec, obj.Loc1_RA, obj.Loc2_DEC)
    const b = initialBearingDeg(centerRAdeg, centerDec, obj.Loc1_RA, obj.Loc2_DEC)
    scored.push({ object: obj, distanceDeg: d, bearingDeg: b })
  }
  scored.sort((a, b) => a.distanceDeg - b.distanceDeg)
  return seed.concat(scored.slice(0, n - seed.length))
}


