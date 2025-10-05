import { useMemo } from 'react'
import { useCamera } from './useCamera'
import { useCameraSimulator } from './useCameraSimulator'

/**
 * useCameraSource
 *
 * Wrapper hook that toggles between real camera and simulated camera
 * based on development mode and a runtime flag. Ensures API parity
 * with `useCamera` so it can be used as a drop-in replacement.
 */
export function useCameraSource(options = {}) {
  const {
    simulate = process.env.NODE_ENV !== 'production',
    debug = false,
    ...rest
  } = options

  const simOpts = useMemo(() => ({ ...rest, debug }), [debug, rest])
  const real = useCamera(rest)
  const sim = useCameraSimulator(simOpts)

  const active = simulate ? sim : real
  return active
}


