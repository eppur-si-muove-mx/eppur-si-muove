import { degToRad, radToDeg, wrapDegrees } from '@/utils/celestialCoordinates'

export function raDecToAltAz(raHours, decDeg, latitudeDeg, longitudeDeg, date = new Date()) {
  // Compute LST hours (reuse gmst via celestialCoordinates through altAzToRaDec invert)
  // We'll reconstruct by computing HA = LST - RA and then alt/az from spherical trig
  const lst = localSiderealTimeHours(date, longitudeDeg)
  const H = degToRad((lst - raHours) * 15) // hour angle in radians
  const dec = degToRad(decDeg)
  const lat = degToRad(latitudeDeg)

  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(H)
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)))
  const cosAz = (Math.sin(dec) - Math.sin(alt) * Math.sin(lat)) / (Math.cos(alt) * Math.cos(lat) || 1e-9)
  let az = Math.acos(Math.max(-1, Math.min(1, cosAz)))
  const sinH = Math.sin(H)
  if (sinH > 0) az = 2 * Math.PI - az // adjust quadrant

  return { altitude: radToDeg(alt), azimuth: wrapDegrees(radToDeg(az)) }
}

export function enuVectorFromAltAz(altDeg, azDeg) {
  // ENU: x=East, y=North, z=Up
  const alt = degToRad(altDeg)
  const az = degToRad(azDeg)
  const x = Math.cos(alt) * Math.sin(az)
  const y = Math.cos(alt) * Math.cos(az)
  const z = Math.sin(alt)
  return { x, y, z }
}

export function projectToScreen(vec, fovDeg, width, height) {
  // Simple pinhole projection—assumes camera looking along +y (North), x=right, z=up
  // vec should already be rotated to device camera frame if needed; for Phase 1
  // we assume ENU aligns approximately to screen in portrait.
  const f = 0.5 * height / Math.tan(degToRad(fovDeg) * 0.5)
  const y = vec.y
  if (y <= 0) return null // behind camera
  const u = (vec.x * f) / y + width / 2
  const v = height / 2 - (vec.z * f) / y
  return { x: u, y: v }
}

function localSiderealTimeHours(date, longitudeDeg) {
  // GMST approximation (same as in celestialCoordinates), reproduced here to avoid circular deps
  const jd = toJulianDate(date)
  const D = jd - 2451545.0
  const H = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600
  let GMST = 6.697374558 + 0.06570982441908 * D + 1.00273790935 * H
  GMST = ((GMST % 24) + 24) % 24
  const LST = GMST + longitudeDeg / 15
  return ((LST % 24) + 24) % 24
}

function toJulianDate(date) {
  const Y = date.getUTCFullYear()
  let M = date.getUTCMonth() + 1
  const D = date.getUTCDate() + (date.getUTCHours() + (date.getUTCMinutes() + date.getUTCSeconds() / 60) / 60) / 24
  let A = Math.floor(Y / 100)
  let B = 2 - A + Math.floor(A / 4)
  if (Y < 1582 || (Y === 1582 && (M < 10 || (M === 10 && D < 15)))) { B = 0 }
  if (M <= 2) { M += 12 }
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + D + B - 1524.5
}


