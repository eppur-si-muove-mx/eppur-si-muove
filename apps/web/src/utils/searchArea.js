import { getRaDecFromDevice, degToRad, wrapHours } from '@/utils/celestialCoordinates'

export function calculateSearchArea(alpha, beta, gamma, latitude, longitude, searchRadiusDegrees = 7) {
  const now = new Date()
  const { raHours, decDeg, altitude } = getRaDecFromDevice(alpha, beta, gamma, latitude, longitude, now)
  const centerRA = wrapHours(raHours)
  const centerDec = Math.max(-90, Math.min(90, decDeg))
  const minDec = Math.max(-90, centerDec - searchRadiusDegrees)
  const maxDec = Math.min(90, centerDec + searchRadiusDegrees)
  const cosDec = Math.cos(degToRad(centerDec))
  let minRA, maxRA
  if (!isFinite(cosDec) || Math.abs(cosDec) < 1e-6) { minRA = 0; maxRA = 24 } else {
    const deltaRAHours = Math.min(12, (searchRadiusDegrees / Math.abs(cosDec)) / 15)
    if (deltaRAHours >= 12 - 1e-6) { minRA = 0; maxRA = 24 } else {
      minRA = wrapHours(centerRA - deltaRAHours); maxRA = wrapHours(centerRA + deltaRAHours)
    }
  }
  return { centerRA, centerDec, minRA, maxRA, minDec, maxDec, searchRadiusDegrees }
}

export default calculateSearchArea


