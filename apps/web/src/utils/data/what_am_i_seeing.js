/**
 * calculate_celestial_coordinates.js
 *
 * Assumptions (per your confirmations):
 * - Inputs from DeviceOrientationEvent in degrees:
 *    alpha: yaw around Z (true-north referenced, 0..360)
 *    beta : pitch around X (front-back tilt, −180..180)
 *    gamma: roll  around Y (left-right tilt, −90..90)
 * - Phone held in portrait; pointing axis is device −Z (back camera).
 * - Az: 0° = true north, increases eastward [0,360)
 * - Alt: 0° horizon, +90° zenith
 * - RA/Dec: apparent (of-date), using UT1≈UTC (good for app use)
 * - Location: lat (° +N), lon (° +E)
 * - Time: JS Date (UTC) or Julian Date number (UTC)
 *
 * Notes:
 * - We compute Local Sidereal Time (LST) from UTC using standard GMST formula (Meeus).
 * - No atmospheric refraction (geometric only).
 * - Rotation order uses intrinsic Z-X'-Y'' (alpha, then beta, then gamma) applied to the device vector.
 */

export function calculate_celestial_coordinates({ observer, time, pointing }) {
  const { lat, lon } = observer; // degrees (+N, +E)
  const { alpha, beta, gamma } = pointing; // degrees
  const jd = (typeof time === 'number') ? time : dateToJulianDate(time);
  const lstDeg = localSiderealTimeDegrees(jd, lon);

  // 1) Device pointing vector in device coordinates (unit): device −Z points out the back camera.
  const vDevice = [0, 0, -1];

  // 2) Build rotation from device → local ENU world frame (X=East, Y=North, Z=Up).
  //    Using intrinsic rotations: R = Rz(alpha) * Rx(beta) * Ry(gamma)
  //    Angles in radians.
  const a = deg2rad(normalizeDeg(alpha));
  const b = deg2rad(beta);
  const g = deg2rad(gamma);

  const Rz = rotZ(a);
  const Rx = rotX(b);
  const Ry = rotY(g);

  // Multiply: R = Rz * Rx * Ry
  const R = matMul(matMul(Rz, Rx), Ry);

  // 3) World (ENU) vector
  const vENU = matVec(R, vDevice);
  const [E, N, U] = vENU;

  // 4) Alt/Az from ENU
  const altRad = Math.asin(clamp(U, -1, 1));
  // Az from north, eastward: atan2(E, N)
  let azRad = Math.atan2(E, N);
  if (azRad < 0) azRad += 2 * Math.PI;

  const alt = rad2deg(altRad);
  const az = rad2deg(azRad);

  // 5) Convert Alt/Az to Hour Angle & Declination at observer latitude
  const phi = deg2rad(lat);

  const sinDec = Math.sin(phi) * Math.sin(altRad) +
                 Math.cos(phi) * Math.cos(altRad) * Math.cos(azRad);
  const decRad = Math.asin(clamp(sinDec, -1, 1));

  // Hour angle from Alt/Az/Dec:
  // sin H = -sin(az) * cos(alt) / cos(dec)
  // cos H = (sin(alt) - sin(phi)*sin(dec)) / (cos(phi)*cos(dec))
  const cosDec = Math.cos(decRad);
  const sinH = -Math.sin(azRad) * Math.cos(altRad) / nonzero(cosDec);
  const cosH = (Math.sin(altRad) - Math.sin(phi) * Math.sin(decRad)) /
               (Math.cos(phi) * nonzero(cosDec));

  let H = Math.atan2(sinH, cosH); // radians in (−π, π]
  if (H < 0) H += 2 * Math.PI;

  // 6) RA = LST - H  (all in degrees, wrap to [0,360))
  const Hdeg = rad2deg(H);
  const raDeg = wrap360(lstDeg - Hdeg);
  const decDeg = rad2deg(decRad);

  return { alt, az, raDeg, decDeg };
}

/* -------------------- Helpers -------------------- */

function deg2rad(d) { return (d * Math.PI) / 180; }
function rad2deg(r) { return (r * 180) / Math.PI; }

function wrap360(d) {
  let x = d % 360;
  if (x < 0) x += 360;
  return x;
}

function normalizeDeg(d) {
  // Bring alpha to [0,360); beta/gamma can be used as-is.
  let x = d % 360;
  if (x < 0) x += 360;
  return x;
}

function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}

function nonzero(x, eps = 1e-12) {
  // Avoid division by zero when cos(dec) ~ 0 near poles/zenith
  return (Math.abs(x) < eps) ? Math.sign(x) * eps || eps : x;
}

/**
 * Rotation matrices (right-handed), angles in radians
 * World frame for ENU: X=East, Y=North, Z=Up
 */
function rotX(t) {
  const c = Math.cos(t), s = Math.sin(t);
  return [
    [1, 0, 0],
    [0, c, -s],
    [0, s,  c],
  ];
}

function rotY(t) {
  const c = Math.cos(t), s = Math.sin(t);
  return [
    [ c, 0, s],
    [ 0, 1, 0],
    [-s, 0, c],
  ];
}

function rotZ(t) {
  const c = Math.cos(t), s = Math.sin(t);
  return [
    [ c, -s, 0],
    [ s,  c, 0],
    [ 0,  0, 1],
  ];
}

function matMul(A, B) {
  // 3x3 * 3x3
  const C = Array.from({ length: 3 }, () => [0,0,0]);
  for (let i = 0; i < 3; i++) {
    for (let k = 0; k < 3; k++) {
      let sum = 0;
      for (let j = 0; j < 3; j++) sum += A[i][j] * B[j][k];
      C[i][k] = sum;
    }
  }
  return C;
}

function matVec(A, v) {
  return [
    A[0][0]*v[0] + A[0][1]*v[1] + A[0][2]*v[2],
    A[1][0]*v[0] + A[1][1]*v[1] + A[1][2]*v[2],
    A[2][0]*v[0] + A[2][1]*v[1] + A[2][2]*v[2],
  ];
}

/* -------------------- Sidereal Time -------------------- */

/**
 * Convert JS Date (UTC) → Julian Date (UTC)
 * If you need TT/TDB, add ΔT handling; for this app UT1≈UTC is fine.
 */
export function dateToJulianDate(date) {
  if (!(date instanceof Date)) {
    throw new TypeError("time must be a JS Date or a Julian Date number");
  }
  const ms = date.getTime(); // ms since Unix epoch (UTC)
  // JD of Unix epoch (1970-01-01T00:00:00Z) is 2440587.5
  return ms / 86400000 + 2440587.5;
}

/**
 * Greenwich Mean Sidereal Time (degrees) using IAU 2000-ish polynomial (Meeus).
 * JD is in UTC (treated as UT1). Accuracy ~0.1s typical for app usage.
 */
export function gmstDegrees(jd) {
  const T = (jd - 2451545.0) / 36525.0;
  let gmst =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000.0;
  return wrap360(gmst);
}

/** Local Sidereal Time (degrees) */
export function localSiderealTimeDegrees(jd, lonDegreesEast) {
  // LST = GMST + longitude (east positive)
  return wrap360(gmstDegrees(jd) + lonDegreesEast);
}

export function calculate_celestial_reticula({
  observer,
  time,
  pointing,
  distance_start,
  distance_end,
  reticula_aperture_deg = 1,
}) {
  const start = calculate_celestial_coordinates({ observer, time, pointing });
  const cosDec = Math.cos((Math.PI / 180) * start.decDeg) || 1e-12;

  // Move by `aperture` toward east AND `aperture` toward north (NE diagonal),
  // using small-angle tangent-plane approximation:
  const raEnd  = wrap360(start.raDeg + (reticula_aperture_deg / cosDec));
  const decEnd = clamp(start.decDeg + reticula_aperture_deg, -90, 90);

  return {
    ra_dec_start: { raDeg: start.raDeg, decDeg: start.decDeg },
    ra_dec_end:   { raDeg: raEnd,       decDeg: decEnd       },
    distance_start,
    distance_end,
  };
}

/* -------------------- Example usage -------------------- */
/*
import { calculate_celestial_coordinates } from './calculate_celestial_coordinates.js';
*/

// const observer = { lat: 19.4326, lon: -99.1332 }; // CDMX
// const time = new Date(); // UTC now
// const pointing = { alpha: 30, beta: -10, gamma: 5 }; // from DeviceOrientationEvent

// const observer = { lat: 0, lon: 0 }; // CDMX
// const time = new Date(); // UTC now
// const pointing = { alpha: 30, beta: 90, gamma: 0 }; // from DeviceOrientationEvent

// let distance_start = 1;
// let distance_end = 1.5;
// let reticula_aperture_deg = 1;

// const { ra_dec_start, ra_dec_end } =
//   calculate_celestial_reticula({ observer, time, pointing, distance_start, distance_end, reticula_aperture_deg });

// console.log({ ra_dec_start, ra_dec_end, distance_start, distance_end });
/**/
