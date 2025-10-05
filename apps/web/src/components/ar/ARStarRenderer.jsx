"use client"

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { raDecToAltAz } from '@/lib/astro/projection'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useDeviceOrientation } from '@/hooks/useDeviceOrientation'
import { CelestialDataManager } from '@/utils/data/celestialDataManager'

export default function ARStarRendererThree({ fovDeg = 65, maxStars = 500 }) {
  const mountRef = useRef(null)
  const geo = useGeolocation({ autoRequest: true, autoWatch: true })
  const orientation = useDeviceOrientation({ autoStart: true })
  const FALLBACK = { lat: 20.67053404521385, lon: -103.37833696752742 }

  const [debugInfo, setDebugInfo] = useState({
    alpha: 0,
    beta: 0,
    gamma: 0,
    screenAngle: 0,
    isIOS: false,
    starCount: 0,
    lookingAt: { altitude: 0, azimuth: 0 }
  })

  // put these helpers outside the effect so they're not recreated each frame
  const zee = new THREE.Vector3(0, 0, 1)
  const euler = new THREE.Euler()
  const q0 = new THREE.Quaternion()
  const q1 = new THREE.Quaternion() // -PI/2 around X, needed because camera looks out the back of the device
  q1.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)

  function setObjectQuaternion(q, alpha, beta, gamma, screenOrient) {
    // Device gives intrinsic ZXY; we convert to YXZ for Three
    // NOTE: gamma must be NEGATED; screen orientation must be NEGATED.
    euler.set(beta, alpha, -gamma, 'YXZ')
    q.setFromEuler(euler)
    q.multiply(q1) // fix for device camera axis
    q.multiply(q0.setFromAxisAngle(zee, -screenOrient)) // account for screen rotation
  }


  useEffect(() => {
    if (!mountRef.current) return

    const width = window.innerWidth
    const height = window.innerHeight

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(fovDeg, width / height, 0.1, 1000)

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mountRef.current.appendChild(renderer.domElement)

    // Add horizon ring for reference
    const horizonGeometry = new THREE.RingGeometry(99, 101, 64)
    const horizonMaterial = new THREE.MeshBasicMaterial({
      color: 0x004400,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3
    })
    const horizonRing = new THREE.Mesh(horizonGeometry, horizonMaterial)
    horizonRing.rotation.x = Math.PI / 2
    scene.add(horizonRing)

    // Add cardinal markers
    const directions = [
      { label: 'N', angle: 0, color: 0xff0000 },
      { label: 'E', angle: 90, color: 0x00ff00 },
      { label: 'S', angle: 180, color: 0x0000ff },
      { label: 'W', angle: 270, color: 0xffff00 }
    ]

    directions.forEach(dir => {
      const angle = dir.angle * Math.PI / 180
      const radius = 95
      const markerGeometry = new THREE.BoxGeometry(2, 10, 2)
      const markerMaterial = new THREE.MeshBasicMaterial({ color: dir.color })
      const marker = new THREE.Mesh(markerGeometry, markerMaterial)
      marker.position.set(
        radius * Math.sin(angle),
        0,
        -radius * Math.cos(angle)
      )
      scene.add(marker)
    })

    const starGeometry = new THREE.BufferGeometry()
    const positions = []
    const colors = []
    const sizes = []

    const starData = CelestialDataManager.getAllObjects()
      .slice()
      .sort((a, b) => (b.temp_estrella * b.radio_estrella) - (a.temp_estrella * a.radio_estrella))
      .slice(0, maxStars)

    function updateStarPositions() {
      const lat = geo.latitude || FALLBACK.lat
      const lon = geo.longitude || FALLBACK.lon
      const now = new Date()

      positions.length = 0
      colors.length = 0
      sizes.length = 0
      let visibleStars = 0

      starData.forEach(star => {
        const { altitude, azimuth } = raDecToAltAz(
          star.Loc1_RA / 15,
          star.Loc2_DEC,
          lat,
          lon,
          now
        )

        if (altitude < -5) return
        visibleStars++

        const altRad = altitude * Math.PI / 180
        const azRad = azimuth * Math.PI / 180

        const distance = 100
        const x = distance * Math.cos(altRad) * Math.sin(azRad)
        const y = distance * Math.sin(altRad)
        const z = -distance * Math.cos(altRad) * Math.cos(azRad)

        positions.push(x, y, z)

        const temp = star.temp_estrella
        const r = temp > 5000 ? 1 : temp / 5000
        const g = temp > 4000 ? 0.9 : temp / 4000 * 0.9
        const b = temp < 7000 ? 1 : 7000 / temp
        colors.push(r, g, b)

        const bright = Math.min(1, (temp - 3000) / 7000 * 0.8 + (star.radio_estrella / 10) * 0.2)
        sizes.push(1 + bright * 3)
      })

      starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
      starGeometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1))

      setDebugInfo(prev => ({ ...prev, starCount: visibleStars }))
    }

    updateStarPositions()

    const starMaterial = new THREE.PointsMaterial({
      vertexColors: true,
      size: 2,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    })

    const starPoints = new THREE.Points(starGeometry, starMaterial)
    scene.add(starPoints)

    const updateInterval = setInterval(updateStarPositions, 1000)

    function calculateLookDirection() {
      const forward = new THREE.Vector3(0, 0, -1)
      forward.applyQuaternion(camera.quaternion)

      const x = forward.x
      const y = forward.y
      const z = -forward.z

      const altitude = Math.atan2(y, Math.sqrt(x * x + z * z)) * 180 / Math.PI
      const azimuth = Math.atan2(x, z) * 180 / Math.PI

      return {
        altitude: altitude.toFixed(1),
        azimuth: ((azimuth + 360) % 360).toFixed(1)
      }
    }

    // Completely new approach for iOS orientation
    // keep a ref for smoothing to reduce jitter
    const targetQ = new THREE.Quaternion()
    const smoothedQ = new THREE.Quaternion()
    const SMOOTHING = 0.25 // 0 = instant, 1 = frozen; tweak as you like

    function updateCameraOrientation() {
      const alphaDeg = orientation.alpha ?? 0
      const betaDeg = orientation.beta ?? 0
      const gammaDeg = orientation.gamma ?? 0
      const screenAngleDeg =
        (window.screen?.orientation?.angle ?? (window).orientation ?? 0)

      // if we have no data, bail early
      if (alphaDeg === 0 && betaDeg === 0 && gammaDeg === 0) return

      // Convert to radians
      const a = THREE.MathUtils.degToRad(alphaDeg)
      const b = THREE.MathUtils.degToRad(betaDeg)
      const g = THREE.MathUtils.degToRad(gammaDeg)
      const s = THREE.MathUtils.degToRad(screenAngleDeg)

      setObjectQuaternion(targetQ, a, b, g, s)

      // Smooth to reduce erratic motion
      THREE.Quaternion.slerp(camera.quaternion, targetQ, smoothedQ, 1 - Math.pow(1 - SMOOTHING, 60 / 60))
      camera.quaternion.copy(smoothedQ)
    }


    let animationId
    function animate() {
      animationId = requestAnimationFrame(animate)
      updateCameraOrientation()
      renderer.render(scene, camera)
    }
    animate()

    function handleResize() {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      clearInterval(updateInterval)
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
      starGeometry.dispose()
      starMaterial.dispose()
    }
  }, [fovDeg, geo.latitude, geo.longitude, orientation.alpha, orientation.beta, orientation.gamma])

  return (
    <>
      <div ref={mountRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }} />

      {/* Crosshair */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 5,
        pointerEvents: 'none'
      }}>
        <svg width="40" height="40">
          <line x1="0" y1="20" x2="40" y2="20" stroke="#00ff99" strokeWidth="2" opacity="0.7" />
          <line x1="20" y1="0" x2="20" y2="40" stroke="#00ff99" strokeWidth="2" opacity="0.7" />
          <circle cx="20" cy="20" r="15" stroke="#00ff99" strokeWidth="1" fill="none" opacity="0.5" />
        </svg>
      </div>

      {/* Debug overlay */}
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: '#00ff99',
        padding: '10px',
        fontFamily: 'monospace',
        fontSize: '11px',
        borderRadius: '4px',
        pointerEvents: 'none'
      }}>
        <div style={{ color: '#ff9900', fontWeight: 'bold', marginBottom: '5px' }}>
          Looking at: Alt {debugInfo.lookingAt.altitude}° Az {debugInfo.lookingAt.azimuth}°
        </div>
        <div>Alpha: {debugInfo.alpha}° (compass)</div>
        <div>Beta: {debugInfo.beta}° (tilt)</div>
        <div>Gamma: {debugInfo.gamma}° (roll)</div>
        <div>Platform: {debugInfo.isIOS ? 'iOS' : 'Android/Other'}</div>
        <div>Stars visible: {debugInfo.starCount}</div>
      </div>
    </>
  )
}