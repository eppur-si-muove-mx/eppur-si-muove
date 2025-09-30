// JS version of celestial coordinate helpers

export function degToRad(deg) { return (deg * Math.PI) / 180 }
export function radToDeg(rad) { return (rad * 180) / Math.PI }
export function wrapDegrees(d) { let x = d % 360; if (x < 0) x += 360; return x }
export function wrapHours(h) { let x = h % 24; if (x < 0) x += 24; return x }

export function deviceOrientationToAltAz(alpha, beta, gamma) {
  if (!isFinite(alpha) || !isFinite(beta) || !isFinite(gamma)) return { altitude: NaN, azimuth: NaN }
  const z = degToRad(alpha); const x = degToRad(beta); const y = degToRad(gamma)
  const cz = Math.cos(z), sz = Math.sin(z); const cx = Math.cos(x), sx = Math.sin(x); const cy = Math.cos(y), sy = Math.sin(y)
  const r00 = cz, r01 = -sz, r02 = 0; const r10 = sz, r11 = cz, r12 = 0; const r20 = 0, r21 = 0, r22 = 1
  const rx00 = 1, rx01 = 0, rx02 = 0; const rx10 = 0, rx11 = cx, rx12 = -sx; const rx20 = 0, rx21 = sx, rx22 = cx
  const R1_00 = r00 * rx00 + r01 * rx10 + r02 * rx20
  const R1_01 = r00 * rx01 + r01 * rx11 + r02 * rx21
  const R1_02 = r00 * rx02 + r01 * rx12 + r02 * rx22
  const R1_10 = r10 * rx00 + r11 * rx10 + r12 * rx20
  const R1_11 = r10 * rx01 + r11 * rx11 + r12 * rx21
  const R1_12 = r10 * rx02 + r11 * rx12 + r12 * rx22
  const R1_20 = r20 * rx00 + r21 * rx10 + r22 * rx20
  const R1_21 = r20 * rx01 + r21 * rx11 + r22 * rx21
  const R1_22 = r20 * rx02 + r21 * rx12 + r22 * rx22
  const ry00 = cy, ry01 = 0, ry02 = sy; const ry10 = 0, ry11 = 1, ry12 = 0; const ry20 = -sy, ry21 = 0, ry22 = cy
  const R00 = R1_00 * ry00 + R1_01 * ry10 + R1_02 * ry20
  const R01 = R1_00 * ry01 + R1_01 * ry11 + R1_02 * ry21
  const R02 = R1_00 * ry02 + R1_01 * ry12 + R1_02 * ry22
  const R10 = R1_10 * ry00 + R1_11 * ry10 + R1_12 * ry20
  const R11 = R1_10 * ry01 + R1_11 * ry11 + R1_12 * ry21
  const R12 = R1_10 * ry02 + R1_11 * ry12 + R1_12 * ry22
  const R20 = R1_20 * ry00 + R1_21 * ry10 + R1_22 * ry20
  const R21 = R1_20 * ry01 + R1_21 * ry11 + R1_22 * ry21
  const R22 = R1_20 * ry02 + R1_21 * ry12 + R1_22 * ry22
  const vx = -R02, vy = -R12, vz = -R22
  const len = Math.hypot(vx, vy, vz) || 1; const nx = vx / len, ny = vy / len, nz = vz / len
  const altitude = radToDeg(Math.asin(nz)); const azRad = Math.atan2(nx, ny); const azimuth = wrapDegrees(radToDeg(azRad))
  return { altitude, azimuth }
}

function toJulianDate(date) {
  const Y = date.getUTCFullYear(); let M = date.getUTCMonth() + 1; const D = date.getUTCDate() + (date.getUTCHours() + (date.getUTCMinutes() + date.getUTCSeconds() / 60) / 60) / 24
  let A = Math.floor(Y / 100); let B = 2 - A + Math.floor(A / 4); if (Y < 1582 || (Y === 1582 && (M < 10 || (M === 10 && D < 15)))) { B = 0 }
  if (M <= 2) { M += 12 }
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + D + B - 1524.5
}

function gmstHours(date) {
  const JD = toJulianDate(date); const D = JD - 2451545.0; const H = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600
  let GMST = 6.697374558 + 0.06570982441908 * D + 1.00273790935 * H
  return wrapHours(((GMST % 24) + 24) % 24)
}

export function altAzToRaDec(altitudeDeg, azimuthDeg, latitudeDeg, longitudeDeg, date) {
  const a = degToRad(altitudeDeg); const A = degToRad(azimuthDeg); const phi = degToRad(latitudeDeg); const lst = wrapHours(gmstHours(date) + longitudeDeg / 15)
  const sinA = Math.sin(a), cosA = Math.cos(a), sinPhi = Math.sin(phi), cosPhi = Math.cos(phi), cosAz = Math.cos(A), sinAz = Math.sin(A)
  const sinDec = sinA * sinPhi + cosA * cosPhi * cosAz; const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)))
  const cosDec = Math.cos(dec) || 1e-9; const sinH = -sinAz * cosA / cosDec; const cosH = (sinA - sinPhi * sinDec) / (cosPhi * cosDec); const H = Math.atan2(sinH, cosH)
  const H_hours = (radToDeg(H) / 15); const raHours = wrapHours(lst - H_hours); const decDeg = radToDeg(dec)
  return { raHours, decDeg, lstHours: lst }
}

export function getRaDecFromDevice(alpha, beta, gamma, latitude, longitude, when = new Date()) {
  const { altitude, azimuth } = deviceOrientationToAltAz(alpha, beta, gamma)
  const { raHours, decDeg, lstHours } = altAzToRaDec(altitude, azimuth, latitude, longitude, when)
  return { raHours, decDeg, altitude, azimuth, lstHours }
}


