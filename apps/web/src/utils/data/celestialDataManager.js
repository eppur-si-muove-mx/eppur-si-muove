import { celestialObjects as defaultDataset } from '@/utils/mockData/celestialObjects'

function wrapRa(ra) { let x = ra % 360; if (x < 0) x += 360; return x }
function clampDec(dec) { return Math.max(-90, Math.min(90, dec)) }
const RA_BIN_DEG = 10
const DEC_BIN_DEG = 10
function regionKey(raDeg, decDeg) {
  const ra = wrapRa(raDeg)
  const dec = clampDec(decDeg)
  const raBin = Math.floor(ra / RA_BIN_DEG)
  const decBin = Math.floor((dec + 90) / DEC_BIN_DEG)
  return `${raBin}:${decBin}`
}

class CelestialDataManagerImpl {
  constructor() {
    this.loaded = false
    this.all = []
    this.idToObj = new Map()
    this.regions = new Map()
    this.byType = { 'Planeta Confirmado': [], 'Candidato': [], 'Falso Positivo': [] }
  }

  loadDataset(dataset = defaultDataset) {
    this.loaded = false
    this.all = []
    this.idToObj.clear()
    this.regions.clear()
    this.byType = { 'Planeta Confirmado': [], 'Candidato': [], 'Falso Positivo': [] }
    for (const item of dataset) {
      const normalized = { ...item, Loc1_RA: wrapRa(item.Loc1_RA), Loc2_DEC: clampDec(item.Loc2_DEC) }
      this.all.push(normalized)
      this.idToObj.set(normalized.id_objeto, normalized)
      this.byType[normalized.disposicion].push(normalized)
      const key = regionKey(normalized.Loc1_RA, normalized.Loc2_DEC)
      const list = this.regions.get(key)
      if (list) list.push(normalized); else this.regions.set(key, [normalized])
    }
    this.loaded = true
  }

  isLoaded() { return this.loaded }
  getObjectById(id) { return this.idToObj.get(id) }
  getObjectsByType(disposicion) { return this.byType[disposicion] ?? [] }
  getAllObjects() { return this.all }
  _getRegion(raDeg, decDeg) { return this.regions.get(regionKey(raDeg, decDeg)) ?? [] }
}

export const CelestialDataManager = new CelestialDataManagerImpl()

if (typeof window !== 'undefined') {
  if (!window.__CELESTIAL_DATA_LOADED__) {
    CelestialDataManager.loadDataset()
    window.__CELESTIAL_DATA_LOADED__ = true
  }
}

export default CelestialDataManager


