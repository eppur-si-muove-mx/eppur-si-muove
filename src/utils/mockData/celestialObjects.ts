/**
 * Mock celestial objects dataset generator.
 *
 * This module exports:
 * - `generateCelestialObjects(count, seed?)` to create a dataset with realistic-ish distributions
 * - `celestialObjects` a prebuilt constant dataset
 *
 * Design notes:
 * - Sky density is higher along an approximate Galactic plane (sinusoidal approximation in equatorial coords)
 * - Additional clusters are placed along/near the plane to make pockets of density for exploration
 * - Physical quantities are sampled with simple astro-inspired distributions (often log-uniform)
 */

export type Disposicion = 'Planeta Confirmado' | 'Candidato' | 'Falso Positivo'

export interface CelestialObject {
  /** Unique identifier in the mocked dataset (e.g. "MOCK-001") */
  id_objeto: string
  /** Disposition: final vetting status (weighted) */
  disposicion: Disposicion
  /** Right Ascension in degrees [0, 360) */
  Loc1_RA: number
  /** Declination in degrees [-90, +90] */
  Loc2_DEC: number
  /** Planet radius in Earth radii (R_earth) */
  radio_planeta: number
  /** Planet equilibrium-ish temperature in Kelvin (K) */
  temp_planeta: number
  /** Orbital period in days */
  periodo_orbital: number
  /** Host star effective temperature in Kelvin (K) */
  temp_estrella: number
  /** Host star radius in Solar radii (R_sun) */
  radio_estrella: number
  /** False positive flags (various vetting failure modes) */
  bandera_fp_nt: boolean
  bandera_fp_ss: boolean
  bandera_fp_co: boolean
  bandera_fp_ec: boolean
}

// --------------------------
// Seeded PRNG utilities
// --------------------------

function xmur3(str: string) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return function seed() {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return h >>> 0
  }
}

function mulberry32(a: number) {
  return function rand() {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeRng(seed: string | number | undefined) {
  if (typeof seed === 'number') return mulberry32(seed >>> 0)
  if (typeof seed === 'string') return mulberry32(xmur3(seed)())
  return mulberry32(xmur3('mock-celestial')())
}

// --------------------------
// Math helpers
// --------------------------

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x))
}

function wrapRa(ra: number) {
  let r = ra % 360
  if (r < 0) r += 360
  return r
}

function gaussian(rng: () => number, mean = 0, std = 1) {
  // Box-Muller
  let u = 0
  let v = 0
  while (u === 0) u = rng()
  while (v === 0) v = rng()
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  return mean + z * std
}

function randUniform(rng: () => number, min: number, max: number) {
  return min + (max - min) * rng()
}

function randLogUniform(rng: () => number, min: number, max: number) {
  const lnMin = Math.log(min)
  const lnMax = Math.log(max)
  const x = lnMin + (lnMax - lnMin) * rng()
  return Math.exp(x)
}

function choiceWeighted<T>(rng: () => number, items: T[], weights: number[]) {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = rng() * total
  for (let i = 0; i < items.length; i += 1) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

// --------------------------
// Sky distribution model
// --------------------------

/**
 * Approximate Galactic plane declination (deg) as a sinusoid in RA.
 * This is a stylized, not exact, mapping to create plausible density.
 */
function approxGalacticPlaneDec(raDeg: number) {
  // Amplitude ~ 27 deg, phase aligns the sinusoid roughly with Milky Way band
  const amplitude = 27
  const phase = -33
  const rad = ((raDeg + phase) * Math.PI) / 180
  return amplitude * Math.sin(rad)
}

type Cluster = { ra: number; dec: number; sigmaRa: number; sigmaDec: number }

function createClusters(rng: () => number, count: number): Cluster[] {
  const clusters: Cluster[] = []
  for (let i = 0; i < count; i += 1) {
    const ra = randUniform(rng, 0, 360)
    const baseDec = approxGalacticPlaneDec(ra)
    const dec = clamp(baseDec + gaussian(rng, 0, 3), -90, 90)
    clusters.push({ ra, dec, sigmaRa: randUniform(rng, 1, 3), sigmaDec: randUniform(rng, 0.5, 2) })
  }
  return clusters
}

function sampleSky(rng: () => number, clusters: Cluster[]) {
  // Mixture: 60% along plane, 25% uniform background, 15% clusters
  const mode = choiceWeighted(rng, ['plane', 'uniform', 'cluster'], [0.6, 0.25, 0.15])
  if (mode === 'uniform') {
    return { ra: randUniform(rng, 0, 360), dec: randUniform(rng, -90, 90) }
  }
  if (mode === 'cluster' && clusters.length > 0) {
    const c = clusters[Math.floor(rng() * clusters.length)]
    const ra = wrapRa(c.ra + gaussian(rng, 0, c.sigmaRa))
    const dec = clamp(c.dec + gaussian(rng, 0, c.sigmaDec), -90, 90)
    return { ra, dec }
  }
  // plane mode
  const ra = randUniform(rng, 0, 360)
  const planeDec = approxGalacticPlaneDec(ra)
  const dec = clamp(planeDec + gaussian(rng, 0, 10), -90, 90)
  return { ra, dec }
}

// --------------------------
// Physical property models
// --------------------------

function sampleDisposition(rng: () => number): Disposicion {
  // 10% Confirmed, 30% Candidate, 60% False Positive
  return choiceWeighted(
    rng,
    ['Planeta Confirmado', 'Candidato', 'Falso Positivo'],
    [0.1, 0.3, 0.6]
  ) as Disposicion
}

function sampleFlags(rng: () => number, disposicion: Disposicion) {
  // Make FP flags more likely when disposition is Falso Positivo
  const base = disposicion === 'Falso Positivo' ? 0.6 : 0.1
  const p = (w = 1) => rng() < clamp(base * w, 0, 0.95)
  return {
    bandera_fp_nt: p(1.0),
    bandera_fp_ss: p(0.9),
    bandera_fp_co: p(0.8),
    bandera_fp_ec: p(0.7),
  }
}

function sampleStar(rng: () => number) {
  // Star temperature 3000-10000 K (roughly K to early A types)
  const temp_estrella = randUniform(rng, 3000, 10000)
  // Star radius 0.1-10 R_sun, log-uniform for diversity
  const radio_estrella = randLogUniform(rng, 0.1, 10)
  return { temp_estrella, radio_estrella }
}

function sampleOrbit(rng: () => number) {
  // Period 0.5-1000 days, log-uniform (more short-period planets)
  const periodo_orbital = randLogUniform(rng, 0.5, 1000)
  return { periodo_orbital }
}

function samplePlanet(rng: () => number, star: { temp_estrella: number; radio_estrella: number }, orbit: { periodo_orbital: number }) {
  // Planet radius 0.5-20 R_earth, log-uniform (many small planets)
  const radio_planeta = randLogUniform(rng, 0.5, 20)

  // Very rough equilibrium temperature scaling
  // a ~ (P/365)^(2/3) AU (assuming ~1 Msun)
  const a = Math.pow(orbit.periodo_orbital / 365, 2 / 3)
  const starFactor = star.temp_estrella / 5778
  const radiusFactor = Math.sqrt(star.radio_estrella)
  const denom = Math.sqrt(Math.max(0.05, 2 * a))
  let temp_planeta = 278 * starFactor * radiusFactor / denom
  // Add stochasticity and clamp to requested range
  temp_planeta = clamp(temp_planeta * randUniform(rng, 0.8, 1.4), 100, 2000)

  return { radio_planeta, temp_planeta }
}

// --------------------------
// ID helpers
// --------------------------

function makeId(i: number, width: number) {
  const n = `${i}`.padStart(width, '0')
  return `MOCK-${n}`
}

// --------------------------
// Public API
// --------------------------

export function generateCelestialObjects(count = 800, seed?: string | number): CelestialObject[] {
  const n = clamp(Math.round(count), 500, 1000)
  const rng = makeRng(seed)
  const clusters = createClusters(rng, 6)
  const width = Math.max(3, `${n}`.length)

  const list: CelestialObject[] = []
  for (let i = 1; i <= n; i += 1) {
    const { ra, dec } = sampleSky(rng, clusters)
    const disposicion = sampleDisposition(rng)
    const star = sampleStar(rng)
    const orbit = sampleOrbit(rng)
    const planet = samplePlanet(rng, star, orbit)
    const flags = sampleFlags(rng, disposicion)

    list.push({
      id_objeto: makeId(i, width),
      disposicion,
      Loc1_RA: wrapRa(ra),
      Loc2_DEC: clamp(dec, -90, 90),
      radio_planeta: planet.radio_planeta,
      temp_planeta: planet.temp_planeta,
      periodo_orbital: orbit.periodo_orbital,
      temp_estrella: star.temp_estrella,
      radio_estrella: star.radio_estrella,
      bandera_fp_nt: flags.bandera_fp_nt,
      bandera_fp_ss: flags.bandera_fp_ss,
      bandera_fp_co: flags.bandera_fp_co,
      bandera_fp_ec: flags.bandera_fp_ec,
    })
  }
  return list
}

// Export a default constant dataset to mimic real data shape
export const celestialObjects: CelestialObject[] = generateCelestialObjects(800, 'default-mock-seed')


