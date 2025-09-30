/**
 * Celestial coordinate helpers
 *
 * This module converts between device orientation → local horizontal (alt/az)
 * and then local horizontal → equatorial (RA/Dec) using the current date/time
 * and observer location.
 *
 * Conventions used here:
 * - Device orientation (alpha, beta, gamma) follow the standard DeviceOrientation
 *   spec: alpha (z/yaw, in degrees 0..360), beta (x/pitch, in degrees -180..180),
 *   gamma (y/roll, in degrees -90..90). We assume alpha corresponds to the
 *   device's magnetic/true heading (0° = North, 90° = East) as commonly exposed
 *   on mobile browsers.
 * - Azimuth A is measured from North towards East: 0° = North, 90° = East,
 *   180° = South, 270° = West.
 * - Altitude a is the angle above the horizon: 0° = horizon, 90° = zenith
 *   (negative values would be below the horizon).
 * - Right Ascension RA is returned in hours (0..24h). Declination Dec in degrees
 *   (-90°..+90°).
 */

// --------------------
// Angle helpers
// --------------------

export function degToRad(deg: number): number { return (deg * Math.PI) / 180 }
export function radToDeg(rad: number): number { return (rad * 180) / Math.PI }
export function wrapDegrees(d: number): number {
  let x = d % 360
  if (x < 0) x += 360
  return x
}
export function wrapHours(h: number): number {
  let x = h % 24
  if (x < 0) x += 24
  return x
}

// --------------------
// Device orientation → Alt/Az
// --------------------

/**
 * Convert DeviceOrientation angles to a local horizontal direction (alt/az).
 *
 * The math assumes the phone's camera is pointing along the device's
 * forward -Z axis. We construct a rotation matrix using Z (alpha), X (beta),
 * Y (gamma) in that order and rotate the forward vector, obtaining a unit
 * vector in the local ENU frame (x=East, y=North, z=Up). From that we derive
 * altitude and azimuth.
 */
export function deviceOrientationToAltAz(alpha: number, beta: number, gamma: number): { altitude: number; azimuth: number } {
  if (!isFinite(alpha) || !isFinite(beta) || !isFinite(gamma)) {
    return { altitude: NaN, azimuth: NaN }
  }

  const z = degToRad(alpha)
  const x = degToRad(beta)
  const y = degToRad(gamma)

  // Rotation matrices Rz(z) * Rx(x) * Ry(y)
  const cz = Math.cos(z), sz = Math.sin(z)
  const cx = Math.cos(x), sx = Math.sin(x)
  const cy = Math.cos(y), sy = Math.sin(y)

  // Multiply Rz * Rx first
  const r00 = cz
  const r01 = -sz
  const r02 = 0
  const r10 = sz
  const r11 = cz
  const r12 = 0
  const r20 = 0
  const r21 = 0
  const r22 = 1

  // Rx
  const rx00 = 1, rx01 = 0, rx02 = 0
  const rx10 = 0, rx11 = cx, rx12 = -sx
  const rx20 = 0, rx21 = sx, rx22 = cx

  // R1 = Rz * Rx
  const R1_00 = r00 * rx00 + r01 * rx10 + r02 * rx20
  const R1_01 = r00 * rx01 + r01 * rx11 + r02 * rx21
  const R1_02 = r00 * rx02 + r01 * rx12 + r02 * rx22
  const R1_10 = r10 * rx00 + r11 * rx10 + r12 * rx20
  const R1_11 = r10 * rx01 + r11 * rx11 + r12 * rx21
  const R1_12 = r10 * rx02 + r11 * rx12 + r12 * rx22
  const R1_20 = r20 * rx00 + r21 * rx10 + r22 * rx20
  const R1_21 = r20 * rx01 + r21 * rx11 + r22 * rx21
  const R1_22 = r20 * rx02 + r21 * rx12 + r22 * rx22

  // Ry
  const ry00 = cy, ry01 = 0, ry02 = sy
  const ry10 = 0,  ry11 = 1, ry12 = 0
  const ry20 = -sy,ry21 = 0, ry22 = cy

  // R = R1 * Ry
  const R00 = R1_00 * ry00 + R1_01 * ry10 + R1_02 * ry20
  const R01 = R1_00 * ry01 + R1_01 * ry11 + R1_02 * ry21
  const R02 = R1_00 * ry02 + R1_01 * ry12 + R1_02 * ry22
  const R10 = R1_10 * ry00 + R1_11 * ry10 + R1_12 * ry20
  const R11 = R1_10 * ry01 + R1_11 * ry11 + R1_12 * ry21
  const R12 = R1_10 * ry02 + R1_11 * ry12 + R1_12 * ry22
  const R20 = R1_20 * ry00 + R1_21 * ry10 + R1_22 * ry20
  const R21 = R1_20 * ry01 + R1_21 * ry11 + R1_22 * ry21
  const R22 = R1_20 * ry02 + R1_21 * ry12 + R1_22 * ry22

  // Forward device vector (camera) in device coords is [0,0,-1]
  // World vector = R * [0,0,-1] = -third column of R
  const vx = -R02
  const vy = -R12
  const vz = -R22

  // Normalize (numerical safety)
  const len = Math.hypot(vx, vy, vz) || 1
  const nx = vx / len, ny = vy / len, nz = vz / len

  // Altitude from Up component, Azimuth from projection (East=x, North=y)
  const altitude = radToDeg(Math.asin(nz))
  const azRad = Math.atan2(nx, ny)
  const azimuth = wrapDegrees(radToDeg(azRad))

  return { altitude, azimuth }
}

// --------------------
// Alt/Az → RA/Dec
// --------------------

/**
 * Compute the Julian Date for a given JS Date (UTC).
 */
function toJulianDate(date: Date): number {
  // Algorithm from Jean Meeus, Astronomical Algorithms
  const Y = date.getUTCFullYear()
  let M = date.getUTCMonth() + 1 // 1..12
  const D = date.getUTCDate() +
    (date.getUTCHours() + (date.getUTCMinutes() + date.getUTCSeconds() / 60) / 60) / 24

  let A = Math.floor(Y / 100)
  let B = 2 - A + Math.floor(A / 4)
  if (Y < 1582 || (Y === 1582 && (M < 10 || (M === 10 && D < 15)))) {
    // Julian calendar
    B = 0
  }
  if (M <= 2) { M += 12 }
  const JD = Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + D + B - 1524.5
  return JD
}

/**
 * Greenwich Mean Sidereal Time (GMST) in hours for a given Date (UTC).
 * Simple, widely used approximation sufficient for AR visualization.
 */
function gmstHours(date: Date): number {
  const JD = toJulianDate(date)
  const D = JD - 2451545.0
  const H = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600
  let GMST = 6.697374558 + 0.06570982441908 * D + 1.00273790935 * H
  return wrapHours(((GMST % 24) + 24) % 24)
}

/**
 * Convert local horizontal (alt/az) to equatorial coordinates (RA/Dec).
 *
 * Inputs: altitude a (deg), azimuth A (deg, 0=North→East), observer latitude φ (deg)
 * and longitude λ (deg, East positive), plus JS Date (UTC).
 *
 * Steps:
 * 1) Compute Local Sidereal Time (LST) from GMST and longitude.
 * 2) Use spherical trigonometry to get Declination δ and Hour Angle H from a, A, φ.
 *    sin δ = sin a sin φ + cos a cos φ cos A
 *    sin H = -sin A cos a / cos δ
 *    cos H = (sin a - sin φ sin δ) / (cos φ cos δ)
 * 3) Right Ascension α = LST - H (wrap to 0..24h)
 */
export function altAzToRaDec(
  altitudeDeg: number,
  azimuthDeg: number,
  latitudeDeg: number,
  longitudeDeg: number,
  date: Date
): { raHours: number; decDeg: number; lstHours: number } {
  const a = degToRad(altitudeDeg)
  const A = degToRad(azimuthDeg)
  const phi = degToRad(latitudeDeg)
  const lst = wrapHours(gmstHours(date) + longitudeDeg / 15) // LST in hours

  const sinA = Math.sin(a), cosA = Math.cos(a)
  const sinPhi = Math.sin(phi), cosPhi = Math.cos(phi)
  const cosAz = Math.cos(A), sinAz = Math.sin(A)

  const sinDec = sinA * sinPhi + cosA * cosPhi * cosAz
  const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)))

  const cosDec = Math.cos(dec) || 1e-9
  const sinH = -sinAz * cosA / cosDec
  const cosH = (sinA - sinPhi * sinDec) / (cosPhi * cosDec)
  const H = Math.atan2(sinH, cosH) // Hour angle in radians

  const H_hours = (radToDeg(H) / 15)
  const raHours = wrapHours(lst - H_hours)
  const decDeg = radToDeg(dec)
  return { raHours, decDeg, lstHours: lst }
}

/**
 * Convenience: Full pipeline from device orientation and GPS → RA/Dec now.
 */
export function getRaDecFromDevice(
  alpha: number,
  beta: number,
  gamma: number,
  latitude: number,
  longitude: number,
  when: Date = new Date()
): { raHours: number; decDeg: number; altitude: number; azimuth: number; lstHours: number } {
  const { altitude, azimuth } = deviceOrientationToAltAz(alpha, beta, gamma)
  const { raHours, decDeg, lstHours } = altAzToRaDec(altitude, azimuth, latitude, longitude, when)
  return { raHours, decDeg, altitude, azimuth, lstHours }
}


