/**
 * Search area utilities for AR sky scanning.
 *
 * Given device orientation and observer location, estimate a sky search
 * region around the camera pointing direction in celestial coordinates.
 */

import { getRaDecFromDevice, degToRad, wrapHours } from '@/utils/celestialCoordinates'

export type SearchBoundary = {
  centerRA: number // hours, 0..24
  centerDec: number // degrees, -90..+90
  minRA: number // hours, 0..24 (may be > maxRA when crossing 0/24 boundary)
  maxRA: number // hours, 0..24
  minDec: number // degrees
  maxDec: number // degrees
  searchRadiusDegrees: number
}

/**
 * Calculate a circular RA/Dec search area centered on the device pointing.
 *
 * Notes on geometry/edge cases:
 * - Near the celestial poles (|Dec| close to 90°), small circles in Dec cover
 *   large RA spans. We approximate the RA half-span as ΔRA ≈ r / cos(Dec).
 *   If cos(Dec) is nearly zero or ΔRA ≥ 180°, we treat the RA range as the
 *   full 0..24 hours.
 * - Crossing RA=0/24: we return minRA/maxRA normalized in 0..24. If the area
 *   crosses the boundary, minRA can be numerically greater than maxRA. Callers
 *   should handle that wrap.
 * - Below horizon: We still return celestial coordinates (they’re well-defined);
 *   callers may choose to ignore negative-altitude scans.
 */
export function calculateSearchArea(
  alpha: number,
  beta: number,
  gamma: number,
  latitude: number,
  longitude: number,
  searchRadiusDegrees = 7
): SearchBoundary {
  const now = new Date()
  const { raHours, decDeg, altitude } = getRaDecFromDevice(alpha, beta, gamma, latitude, longitude, now)

  // Base RA/Dec center
  const centerRA = wrapHours(raHours)
  const centerDec = Math.max(-90, Math.min(90, decDeg))

  // Dec bounds (simple clamp around center)
  const minDec = Math.max(-90, centerDec - searchRadiusDegrees)
  const maxDec = Math.min(90, centerDec + searchRadiusDegrees)

  // RA half-span in hours using small-angle approx at given Dec
  const cosDec = Math.cos(degToRad(centerDec))
  let minRA: number
  let maxRA: number
  if (!isFinite(cosDec) || Math.abs(cosDec) < 1e-6) {
    // Essentially at the pole: entire RA circle is in range
    minRA = 0
    maxRA = 24
  } else {
    const deltaRAHours = Math.min(12, (searchRadiusDegrees / Math.abs(cosDec)) / 15)
    if (deltaRAHours >= 12 - 1e-6) {
      minRA = 0
      maxRA = 24
    } else {
      minRA = wrapHours(centerRA - deltaRAHours)
      maxRA = wrapHours(centerRA + deltaRAHours)
    }
  }

  // Consumers might choose to ignore below-horizon (altitude < 0) areas; we
  // still return the celestial bounds since they are useful for prediction.
  return { centerRA, centerDec, minRA, maxRA, minDec, maxDec, searchRadiusDegrees }
}

export default calculateSearchArea


