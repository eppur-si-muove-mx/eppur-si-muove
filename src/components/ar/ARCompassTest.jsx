"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { raDecToAltAz } from "@/lib/astro/projection";
import { CelestialDataManager } from "@/utils/data/celestialDataManager";

export default function ARStarAR({
  fovDeg = 65,
  smoothing = 0.2,
  maxStars = 600,           // tune this
}) {
  const mountRef = useRef(null);
  const [motionReady, setMotionReady] = useState(false);
  const [debug, setDebug] = useState({ alpha: 0, beta: 0, gamma: 0, screen: 0, heading: 0 });

  // --- device->camera quaternion helpers ---
  const zee = new THREE.Vector3(0, 0, 1);
  const euler = new THREE.Euler();
  const q0 = new THREE.Quaternion();
  const q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);

  function setObjectQuaternion(q, alpha, beta, gamma, screenOrient) {
    // Device Z-X-Y -> Three Y-X-Z
    euler.set(beta, alpha, -gamma, "YXZ");
    q.setFromEuler(euler);
    q.multiply(q1);
    q.multiply(q0.setFromAxisAngle(zee, -screenOrient));
  }

  async function enableMotion() {
    const DME = window.DeviceMotionEvent;
    const DOE = window.DeviceOrientationEvent;
    try {
      if (DOE && typeof DOE.requestPermission === "function") {
        await DOE.requestPermission();
      }
      if (DME && typeof DME.requestPermission === "function") {
        try { await DME.requestPermission(); } catch {}
      }
      setMotionReady(true);
    } catch (e) {
      console.error(e);
      alert("Could not enable motion sensors.");
    }
  }

  useEffect(() => {
    if (!mountRef.current) return;

    // ---- Renderer / Scene ----
    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    // keep opaque while debugging; set to null later if you want transparency
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(fovDeg, width / height, 0.01, 5000);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000814, 0);
    mountRef.current.appendChild(renderer.domElement);

    Object.assign(renderer.domElement.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      willChange: "transform",
      transform: "translateZ(0)",
    });

    // ---- Reference horizon + cardinal dots (optional) ----
    const R = 100;
    const horizon = new THREE.Mesh(
      new THREE.RingGeometry(R - 1, R + 1, 256),
      new THREE.MeshBasicMaterial({ color: 0x00aa66, transparent: true, opacity: 0.28, side: THREE.DoubleSide })
    );
    horizon.rotation.x = Math.PI / 2;
    scene.add(horizon);

    function addCardinal(azDeg, color) {
      const az = THREE.MathUtils.degToRad(azDeg);
      const x = R * Math.sin(az);
      const y = 0;
      const z = -R * Math.cos(az);
      const m = new THREE.Mesh(new THREE.SphereGeometry(3.5, 16, 16), new THREE.MeshBasicMaterial({ color }));
      m.position.set(x, y, z);
      scene.add(m);
    }
    addCardinal(0, 0xff4d4d);   // N
    addCardinal(90, 0x33ff99);  // E
    addCardinal(180, 0x6699ff); // S
    addCardinal(270, 0xfff066); // W

    // ---- STARFIELD (built once) ----
    const FALLBACK = { lat: 20.67053404521385, lon: -103.37833696752742 };
    let geoLat = FALLBACK.lat, geoLon = FALLBACK.lon;
    let when = new Date(); // captured once

    // Try a one-shot geolocation; continue immediately with fallback
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          geoLat = pos.coords.latitude ?? geoLat;
          geoLon = pos.coords.longitude ?? geoLon;
          buildStars();  // rebuild with real coords if it arrived late
        },
        () => { /* ignore errors; fallback already set */ }
      );
    }

    // Preload/choose star data, brightest first
    const baseStarData = CelestialDataManager.getAllObjects()
      .slice()
      .sort((a, b) => (b.temp_estrella * b.radio_estrella) - (a.temp_estrella * a.radio_estrella))
      .slice(0, maxStars);

    let starPoints = null; // keep for cleanup
    function buildStars() {
      // Remove previous (if any)
      if (starPoints) {
        scene.remove(starPoints);
        starPoints.geometry.dispose();
        starPoints.material.dispose();
        starPoints = null;
      }

      const positions = new Float32Array(baseStarData.length * 3);
      const colors = new Float32Array(baseStarData.length * 3);
      const sizes = new Float32Array(baseStarData.length);

      let idx = 0;
      for (let i = 0; i < baseStarData.length; i++) {
        const s = baseStarData[i];

        // Convert once at startup
        const { altitude, azimuth } = raDecToAltAz(
          s.Loc1_RA / 15,     // your RA appears to be in hours*15 previously
          s.Loc2_DEC,
          geoLat,
          geoLon,
          when
        );

        // Cull stars below horizon (keep a small margin)
        if (altitude < -5) continue;

        const altRad = THREE.MathUtils.degToRad(altitude);
        const azRad  = THREE.MathUtils.degToRad(azimuth);

        const dist = 100;
        const x = dist * Math.cos(altRad) * Math.sin(azRad);
        const y = dist * Math.sin(altRad);
        const z = -dist * Math.cos(altRad) * Math.cos(azRad);

        positions[idx * 3 + 0] = x;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = z;

        // Simple color/brightness mapping by temperature & radius
        const temp = s.temp_estrella ?? 5500;
        const r = temp > 5000 ? 1 : temp / 5000;
        const g = temp > 4000 ? 0.9 : Math.max(0, (temp / 4000) * 0.9);
        const b = temp < 7000 ? 1 : Math.min(1, 7000 / temp);
        colors[idx * 3 + 0] = r;
        colors[idx * 3 + 1] = g;
        colors[idx * 3 + 2] = b;

        const bright = Math.min(1, ((temp - 3000) / 7000) * 0.8 + ((s.radio_estrella ?? 1) / 10) * 0.2);
        sizes[idx] = 1 + bright * 3;

        idx++;
      }

      // Shrink arrays to actual count
      const posTrim = positions.subarray(0, idx * 3);
      const colTrim = colors.subarray(0, idx * 3);
      const sizTrim = sizes.subarray(0, idx);

      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.Float32BufferAttribute(posTrim, 3));
      geom.setAttribute("color",    new THREE.Float32BufferAttribute(colTrim, 3));
      geom.setAttribute("size",     new THREE.Float32BufferAttribute(sizTrim, 1));

      const mat = new THREE.PointsMaterial({
        vertexColors: true,
        size: 2,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      starPoints = new THREE.Points(geom, mat);
      scene.add(starPoints);
    }

    // Build immediately with fallback, then maybe rebuild when geolocation arrives
    buildStars();

    // ---- Orientation ----
    let alphaDeg = 0, betaDeg = 0, gammaDeg = 0;
    let screenAngleDeg = 0;

    function readScreenAngle() {
      screenAngleDeg =
        (window.screen?.orientation?.angle) ??
        window.orientation ??
        0;
    }
    readScreenAngle();

    function onOrient(e) {
      if (typeof e.alpha === "number") alphaDeg = e.alpha;
      if (typeof e.beta === "number") betaDeg = e.beta;
      if (typeof e.gamma === "number") gammaDeg = e.gamma;
    }

    function updateCamera() {
      const a = THREE.MathUtils.degToRad(alphaDeg);
      const b = THREE.MathUtils.degToRad(betaDeg);
      const g = THREE.MathUtils.degToRad(gammaDeg);
      const s = THREE.MathUtils.degToRad(screenAngleDeg);

      const targetQ = new THREE.Quaternion();
      setObjectQuaternion(targetQ, a, b, g, s);

      const k = 1 - Math.pow(1 - smoothing, 60 / 60);
      if (k <= 0) camera.quaternion.copy(targetQ);
      else if (typeof camera.quaternion.slerp === "function") camera.quaternion.slerp(targetQ, k);
      else if (typeof camera.quaternion.slerpQuaternions === "function")
        camera.quaternion.slerpQuaternions(camera.quaternion, targetQ, k);
      else camera.quaternion.copy(targetQ);

      // debug
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const heading = (Math.atan2(fwd.x, -fwd.z) * 180) / Math.PI;
      setDebug((d) => ({
        ...d,
        alpha: +alphaDeg.toFixed(1),
        beta: +betaDeg.toFixed(1),
        gamma: +gammaDeg.toFixed(1),
        screen: screenAngleDeg,
        heading: ((heading + 360) % 360).toFixed(1),
      }));
    }

    // ---- Animation loop ----
    function loop() {
      updateCamera();
      renderer.render(scene, camera);
    }
    renderer.setAnimationLoop(loop);

    // ---- Events ----
    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", () => { readScreenAngle(); onResize(); });

    if (motionReady) window.addEventListener("deviceorientation", onOrient, true);

    // ---- Cleanup ----
    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", readScreenAngle);
      window.removeEventListener("deviceorientation", onOrient);
      renderer.dispose();
      if (starPoints) {
        starPoints.geometry.dispose();
        starPoints.material.dispose();
      }
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [fovDeg, motionReady, smoothing, maxStars]);

  return (
    <>
      <div
        ref={mountRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
          willChange: "transform",
          transform: "translateZ(0)",
        }}
      />

      {/* Crosshair */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 5, pointerEvents: "none" }}>
        <svg width="40" height="40">
          <line x1="0" y1="20" x2="40" y2="20" stroke="#00ff99" strokeWidth="2" opacity="0.7" />
          <line x1="20" y1="0" x2="20" y2="40" stroke="#00ff99" strokeWidth="2" opacity="0.7" />
          <circle cx="20" cy="20" r="15" stroke="#00ff99" strokeWidth="1" fill="none" opacity="0.5" />
        </svg>
      </div>

      {/* Motion permission — keep your fixed positioning tweak */}
      {!motionReady && (
        <button
          onClick={enableMotion}
          style={{
            position: "fixed",   // <- your tweak
            left: 16,
            bottom: 16,
            zIndex: 10,
            padding: "10px 14px",
            background: "#0b0",
            color: "white",
            borderRadius: 8,
            border: "none",
          }}
        >
          Enable Motion
        </button>
      )}

      {/* Debug */}
      <div style={{ position: "absolute", top: 10, left: 10, zIndex: 10, backgroundColor: "rgba(0,0,0,0.8)", color: "#00ff99", padding: 10, fontFamily: "monospace", fontSize: 11, borderRadius: 4, pointerEvents: "none" }}>
        <div>α (compass): {debug.alpha}°</div>
        <div>β (tilt): {debug.beta}°</div>
        <div>γ (roll): {debug.gamma}°</div>
        <div>screen: {debug.screen}°</div>
        <div>heading: {debug.heading}°</div>
      </div>
    </>
  );
}
