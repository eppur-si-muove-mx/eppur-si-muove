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

export function searchCelestialObjects(searchArea: SearchBoundary, dataset?: CelestialObject[]): SearchResult[] {
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

  const results: SearchResult[] = []
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
  return results
}

export default searchCelestialObjects


