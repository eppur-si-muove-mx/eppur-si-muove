/**
 * Celestial Data Manager
 *
 * Loads the mock celestial objects and builds simple spatial indexes for
 * fast lookups. RA/Dec are binned into coarse sky regions (RA,Dec bins) to
 * accelerate regional queries in the future.
 */

import type { Disposicion as MockDisposicion, CelestialObject as MockCelestialObject } from '@/utils/mockData/celestialObjects'
import { celestialObjects as defaultDataset } from '@/utils/mockData/celestialObjects'

export type Disposicion = 'Planeta Confirmado' | 'Candidato' | 'Falso Positivo'

// Mirror the required interface explicitly (even though mockData already exports it)
export interface CelestialObject {
  id_objeto: string
  disposicion: Disposicion
  Loc1_RA: number
  Loc2_DEC: number
  radio_planeta: number
  temp_planeta: number
  periodo_orbital: number
  temp_estrella: number
  radio_estrella: number
  bandera_fp_nt: boolean
  bandera_fp_ss: boolean
  bandera_fp_co: boolean
  bandera_fp_ec: boolean
}

const RA_BIN_DEG = 10 // 36 bins over RA
const DEC_BIN_DEG = 10 // 18 bins over Dec

function wrapRa(ra: number): number {
  let x = ra % 360
  if (x < 0) x += 360
  return x
}

function clampDec(dec: number): number {
  return Math.max(-90, Math.min(90, dec))
}

function regionKey(raDeg: number, decDeg: number): string {
  const ra = wrapRa(raDeg)
  const dec = clampDec(decDeg)
  const raBin = Math.floor(ra / RA_BIN_DEG)
  const decBin = Math.floor((dec + 90) / DEC_BIN_DEG)
  return `${raBin}:${decBin}`
}

class CelestialDataManagerImpl {
  private loaded = false
  private all: CelestialObject[] = []
  private idToObj = new Map<string, CelestialObject>()
  private regions = new Map<string, CelestialObject[]>()
  private byType: Record<Disposicion, CelestialObject[]> = {
    'Planeta Confirmado': [],
    'Candidato': [],
    'Falso Positivo': [],
  }

  loadDataset(dataset: CelestialObject[] = defaultDataset as unknown as CelestialObject[]): void {
    // Reset state
    this.loaded = false
    this.all = []
    this.idToObj.clear()
    this.regions.clear()
    this.byType = { 'Planeta Confirmado': [], 'Candidato': [], 'Falso Positivo': [] }

    // Normalize and index
    for (const item of dataset) {
      const normalized: CelestialObject = {
        ...item,
        Loc1_RA: wrapRa(item.Loc1_RA),
        Loc2_DEC: clampDec(item.Loc2_DEC),
      }
      this.all.push(normalized)
      this.idToObj.set(normalized.id_objeto, normalized)
      this.byType[normalized.disposicion].push(normalized)

      const key = regionKey(normalized.Loc1_RA, normalized.Loc2_DEC)
      const list = this.regions.get(key)
      if (list) list.push(normalized)
      else this.regions.set(key, [normalized])
    }
    this.loaded = true
  }

  isLoaded(): boolean { return this.loaded }

  getObjectById(id: string): CelestialObject | undefined {
    return this.idToObj.get(id)
  }

  getObjectsByType(disposicion: Disposicion): CelestialObject[] {
    return this.byType[disposicion] ?? []
  }

  getAllObjects(): CelestialObject[] { return this.all }

  /**
   * Internal: lookup by region key; not part of the requested public API but
   * useful for future spatial queries.
   */
  _getRegion(raDeg: number, decDeg: number): CelestialObject[] {
    return this.regions.get(regionKey(raDeg, decDeg)) ?? []
  }
}

export const CelestialDataManager = new CelestialDataManagerImpl()

// Auto-load the default dataset lazily on first import for convenience
if (typeof window !== 'undefined') {
  // avoid multiple loads during fast refresh; load only once per session
  if (!(window as any).__CELESTIAL_DATA_LOADED__) {
    CelestialDataManager.loadDataset()
    ;(window as any).__CELESTIAL_DATA_LOADED__ = true
  }
}

export default CelestialDataManager


