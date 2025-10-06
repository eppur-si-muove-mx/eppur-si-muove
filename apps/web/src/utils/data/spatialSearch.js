import { CelestialDataManager } from '@/utils/data/celestialDataManager'
import { degToRad, radToDeg, wrapDegrees } from '@/utils/celestialCoordinates'

function raHoursToDeg(hours) { return hours * 15 }

function angularSeparationDeg(ra1Deg, dec1Deg, ra2Deg, dec2Deg) {
  const φ1 = degToRad(dec1Deg)
  const φ2 = degToRad(dec2Deg)
  const Δλ = degToRad(wrapDegrees(ra2Deg - ra1Deg))
  const cosd = Math.sin(φ1) * Math.sin(φ2) + Math.cos(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  const d = Math.acos(Math.max(-1, Math.min(1, cosd)))
  return radToDeg(d)
}

function initialBearingDeg(ra1Deg, dec1Deg, ra2Deg, dec2Deg) {
  const φ1 = degToRad(dec1Deg)
  const φ2 = degToRad(dec2Deg)
  const λ1 = degToRad(ra1Deg)
  const λ2 = degToRad(ra2Deg)
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1)
  const θ = Math.atan2(y, x)
  return wrapDegrees(radToDeg(θ))
}

export function searchCelestialObjects(searchArea, dataset, opts = {}) {
  const centerRAdeg = raHoursToDeg(searchArea.centerRA)
  const centerDec = searchArea.centerDec
  const minRADeg = raHoursToDeg(searchArea.minRA)
  const maxRADeg = raHoursToDeg(searchArea.maxRA)
  const minDec = searchArea.minDec
  const maxDec = searchArea.maxDec

  const segments = minRADeg <= maxRADeg ? [{ min: minRADeg, max: maxRADeg }] : [{ min: minRADeg, max: 360 }, { min: 0, max: maxRADeg }]
  const source = dataset ?? CelestialDataManager.getAllObjects()

  console.log('[SpatialSearch] bounds RA(deg):', { minRADeg, maxRADeg }, 'Dec:', { minDec, maxDec })

  let results = []
  for (const obj of source) {
    const ra = wrapDegrees(obj.Loc1_RA)
    const dec = obj.Loc2_DEC
    if (dec < minDec || dec > maxDec) continue
    let inRA = false
    for (const seg of segments) { if (ra >= seg.min && ra <= seg.max) { inRA = true; break } }
    if (!inRA) continue
    const distanceDeg = angularSeparationDeg(centerRAdeg, centerDec, ra, dec)
    const bearingDeg = initialBearingDeg(centerRAdeg, centerDec, ra, dec)
    results.push({ object: obj, distanceDeg, bearingDeg })
  }
  results.sort((a, b) => a.distanceDeg - b.distanceDeg)
  console.log(`[SpatialSearch] Found ${results.length} objects in search area`)

  const predictable = (typeof process !== 'undefined' && (process.env.PREDICTABLE_SEARCH === 'true' || process.env.NEXT_PUBLIC_PREDICTABLE_SEARCH === 'true')) || (typeof window !== 'undefined' && (window).__PREDICTABLE_SEARCH === true)
  if (!predictable) return results

  const alpha = opts.alpha ?? 0
  const beta = opts.beta ?? 0
  const direction = humanDirection(alpha, beta)
  console.log(`DEBUG: Returning predictable results for ${direction}`)

  let count = 0
  if (typeof window !== 'undefined') { const w = window; w.__SCAN_COUNT = (w.__SCAN_COUNT || 0) + 1; count = w.__SCAN_COUNT } else { globalThis.__SCAN_COUNT = ((globalThis).__SCAN_COUNT || 0) + 1; count = (globalThis).__SCAN_COUNT }

  const ensureAtLeast = (n) => { if (results.length >= n) return; results = augmentFromDataset(centerRAdeg, centerDec, source, results, n) }
  switch (direction) {
    case 'Up': { const confirmed = results.filter(r => r.object.disposicion === 'Planeta Confirmado'); results = confirmed.length ? [confirmed[0]] : augmentFromDataset(centerRAdeg, centerDec, source, [], 1, 'Planeta Confirmado'); break }
    case 'North': { ensureAtLeast(3); results = results.slice(0, 3); break }
    case 'South': { const cand = results.find(r => r.object.disposicion === 'Candidato'); results = cand ? [cand] : augmentFromDataset(centerRAdeg, centerDec, source, [], 1, 'Candidato'); break }
    case 'East': { results = []; break }
    case 'West': { ensureAtLeast(5); results = results.slice(0, 5); break }
  }
  if (count % 3 === 0 && results.length === 0) { results = augmentFromDataset(centerRAdeg, centerDec, source, [], 1) }
  return results
}

export default searchCelestialObjects

function humanDirection(alpha, beta) {
  if (beta > 60) return 'Up'
  const a = ((alpha % 360) + 360) % 360
  if (a >= 315 || a < 45) return 'North'
  if (a >= 45 && a < 135) return 'East'
  if (a >= 135 && a < 225) return 'South'
  return 'West'
}

function augmentFromDataset(centerRAdeg, centerDec, dataset, seed, n, requiredType) {
  const existingIds = new Set(seed.map(r => r.object.id_objeto))
  const scored = []
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


