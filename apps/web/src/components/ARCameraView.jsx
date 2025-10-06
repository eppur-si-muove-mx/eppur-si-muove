"use client"

import { useEffect, useMemo, useRef } from 'react'
import { useCamera } from '@/hooks/useCamera'
import * as THREE from 'three'

/**
 * ARCameraView
 * - Uses `useCamera` to obtain a MediaStream
 * - Renders a full-viewport background video (absolute positioned)
 * - Maintains aspect ratio using object-fit: cover
 * - Listens to orientation changes via the hook (no manual rotation needed)
 * - HTML5 <video> for now; can be swapped for Three.js texture later
 */
export default function ARCameraView(props) {
  const {
    autoStart = false,
    facingMode = 'environment',
    frameRate = 30,
    className,
    style,
    zIndex = -1, // behind content by default
    onReady,
  } = props || {}

  const {
    stream,
    start,
    stop,
    isActive,
    isLoading,
    error,
    orientation, // 'portrait' | 'landscape'
  } = useCamera({ facingMode, frameRate, autoStart })

  const canvasRef = useRef(null)
  const threeRef = useRef({ renderer: null, scene: null, camera: null, mesh: null })
  const videoElRef = useRef(null)
  const videoTexRef = useRef(null)
  const rafRef = useRef(null)

  // Compute UV transform that emulates CSS object-fit: cover
  const computeUvScaleOffset = (videoW, videoH, canvasW, canvasH) => {
    if (!videoW || !videoH || !canvasW || !canvasH) return { scale: [1, 1], offset: [0, 0] }
    const videoAspect = videoW / videoH
    const canvasAspect = canvasW / canvasH
    if (videoAspect > canvasAspect) {
      const scaleX = canvasAspect / videoAspect
      return { scale: [scaleX, 1], offset: [(1 - scaleX) * 0.5, 0] }
    } else {
      const scaleY = videoAspect / canvasAspect
      return { scale: [1, scaleY], offset: [0, (1 - scaleY) * 0.5] }
    }
  }

  // Initialize Three.js renderer/scene/camera once
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearColor(0x000000, 1)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    // Fullscreen quad (size 2x2) with shader that applies night-vision tint
    const geometry = new THREE.PlaneGeometry(2, 2)
    const material = new THREE.ShaderMaterial({
      uniforms: {
        tVideo: { value: null },
        uTintStrength: { value: 0.7 },
        uUvScale: { value: new THREE.Vector2(1, 1) },
        uUvOffset: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision mediump float;
        uniform sampler2D tVideo;
        uniform float uTintStrength;
        uniform vec2 uUvScale;
        uniform vec2 uUvOffset;
        varying vec2 vUv;
        void main() {
          vec2 uv = vec2(uUvScale.x * vUv.x + uUvOffset.x, uUvScale.y * vUv.y + uUvOffset.y);
          vec4 src = texture2D(tVideo, uv);
          float lum = dot(src.rgb, vec3(0.299, 0.587, 0.114));
          vec3 greenTone = vec3(0.0, 0.9, 1.0) * lum;
          vec3 tinted = mix(src.rgb, greenTone, uTintStrength);
          gl_FragColor = vec4(tinted, 1.0);
        }
      `,
    })
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    threeRef.current = { renderer, scene, camera, mesh }

    const handleResize = () => {
      const width = canvas.clientWidth || window.innerWidth
      const height = canvas.clientHeight || window.innerHeight
      renderer.setSize(width, height, false)
      renderer.setViewport(0, 0, width, height)
      const video = videoElRef.current
      if (video && mesh && mesh.material && mesh.material.uniforms) {
        const { scale, offset } = computeUvScaleOffset(video.videoWidth, video.videoHeight, width, height)
        mesh.material.uniforms.uUvScale.value.set(scale[0], scale[1])
        mesh.material.uniforms.uUvOffset.value.set(offset[0], offset[1])
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)

    const renderLoop = () => {
      rafRef.current = requestAnimationFrame(renderLoop)
      if (videoTexRef.current && videoTexRef.current.needsUpdate !== false) {
        // Three automatically updates VideoTexture each frame
      }
      renderer.render(scene, camera)
    }
    renderLoop()

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', handleResize)
      if (mesh) {
        mesh.geometry.dispose()
        if (mesh.material && mesh.material.dispose) mesh.material.dispose()
        scene.remove(mesh)
      }
      renderer.dispose()
    }
  }, [])

  // Bind MediaStream to a hidden <video> and create a VideoTexture
  useEffect(() => {
    if (!stream) return
    let stopped = false
    const video = document.createElement('video')
    video.setAttribute('playsinline', '')
    video.muted = true
    video.autoplay = true
    video.controls = false
    videoElRef.current = video

    try {
      video.srcObject = stream
    } catch (_) {
      // eslint-disable-next-line no-unused-expressions
      video.src = video.src || ''
    }

    const onCanPlay = () => {
      if (stopped) return
      const playPromise = video.play()
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {})
      }

      const tex = new THREE.VideoTexture(video)
      tex.minFilter = THREE.LinearFilter
      tex.magFilter = THREE.LinearFilter
      tex.format = THREE.RGBFormat
      videoTexRef.current = tex

      const { mesh, renderer } = threeRef.current
      if (mesh && mesh.material && mesh.material.uniforms) {
        mesh.material.uniforms.tVideo.value = tex
        const width = renderer?.domElement?.clientWidth || window.innerWidth
        const height = renderer?.domElement?.clientHeight || window.innerHeight
        const { scale, offset } = computeUvScaleOffset(video.videoWidth, video.videoHeight, width, height)
        mesh.material.uniforms.uUvScale.value.set(scale[0], scale[1])
        mesh.material.uniforms.uUvOffset.value.set(offset[0], offset[1])
      }
    }

    video.addEventListener('loadedmetadata', onCanPlay)
    video.addEventListener('canplay', onCanPlay)

    return () => {
      stopped = true
      video.removeEventListener('loadedmetadata', onCanPlay)
      video.removeEventListener('canplay', onCanPlay)
      try {
        video.pause()
      } catch (_) {}
      if (videoTexRef.current) {
        videoTexRef.current.dispose()
        videoTexRef.current = null
      }
      videoElRef.current = null
    }
  }, [stream])

  // If caller opted into autoStart, start/stop with mount lifecycle
  useEffect(() => {
    if (!autoStart) return undefined
    start()
    return () => {
      stop()
    }
  }, [autoStart, start, stop])

  // Expose simple controller to parent when requested
  useEffect(() => {
    if (typeof onReady === 'function') {
      onReady({ start, stop, isActive, isLoading, error })
    }
  }, [onReady, start, stop, isActive, isLoading, error])

  // Styles for full-viewport background
  const containerStyle = useMemo(() => ({
    position: 'absolute',
    inset: 0,
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    zIndex,
    pointerEvents: 'none', // let UI above receive touches
    ...style,
  }), [style, zIndex])

  const canvasStyle = useMemo(() => ({
    width: '100%',
    height: '100%',
    display: 'block',
    transform: 'translateZ(0)',
  }), [])

  return (
    <div className={className} style={containerStyle} aria-live="polite">
      <canvas ref={canvasRef} style={canvasStyle} />
    </div>
  )
}


