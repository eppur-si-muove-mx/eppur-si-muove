"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export default function ARCompassTest({ fovDeg = 65, smoothing = 0.2 }) {
  const mountRef = useRef(null);
  const [motionReady, setMotionReady] = useState(false);
  const [debug, setDebug] = useState({ alpha: 0, beta: 0, gamma: 0, screen: 0, heading: 0 });

  const zee = new THREE.Vector3(0, 0, 1);
  const euler = new THREE.Euler();
  const q0 = new THREE.Quaternion();
  const q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);

  function setObjectQuaternion(q, alpha, beta, gamma, screenOrient) {
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

    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000814);

    const camera = new THREE.PerspectiveCamera(fovDeg, width / height, 0.01, 5000);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000814, 0.5);
    mountRef.current.appendChild(renderer.domElement);

    Object.assign(renderer.domElement.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      willChange: "transform",
      transform: "translateZ(0)",
    });

    // Horizon
    const R = 100;
    const horizon = new THREE.Mesh(
      new THREE.RingGeometry(R - 1, R + 1, 256),
      new THREE.MeshBasicMaterial({ color: 0x00aa66, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    horizon.rotation.x = Math.PI / 2;
    scene.add(horizon);

    // Arcs
    function addArcBoxes(axis) {
      const count = 36;
      for (let i = 0; i < count; i++) {
        const t = (i / count) * Math.PI * 2;
        let pos = new THREE.Vector3();
        if (axis === "NS") pos.set(0, R * Math.sin(t), R * Math.cos(t));
        else pos.set(R * Math.cos(t), R * Math.sin(t), 0);
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(3.5, 3.5, 3.5),
          new THREE.MeshBasicMaterial({ color: axis === "NS" ? 0xff4444 : 0x4488ff })
        );
        box.position.copy(pos);
        scene.add(box);
      }
    }
    addArcBoxes("NS");
    addArcBoxes("EW");

    // Spinner cube
    const spinner = new THREE.Mesh(
      new THREE.BoxGeometry(10, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true })
    );
    spinner.position.set(0, 0, -80);
    scene.add(spinner);

    // Orientation state
    let alphaDeg = 0, betaDeg = 0, gammaDeg = 0;
    let screenAngleDeg = 0;
    function readScreenAngle() {
      screenAngleDeg =
        (window.screen?.orientation?.angle) ?? window.orientation ?? 0;
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
      else if (typeof camera.quaternion.slerpQuaternions === "function") camera.quaternion.slerpQuaternions(camera.quaternion, targetQ, k);
      else camera.quaternion.copy(targetQ);

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

    function loop() {
      spinner.rotation.y += 0.02;
      updateCamera();
      renderer.render(scene, camera);
    }
    renderer.setAnimationLoop(loop);

    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", readScreenAngle);

    if (motionReady) {
      window.addEventListener("deviceorientation", onOrient, true);
    }

    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", readScreenAngle);
      window.removeEventListener("deviceorientation", onOrient);
      renderer.dispose();
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [fovDeg, motionReady, smoothing]);

  return (
    <>
      <div ref={mountRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1 }} />

      {/* Crosshair */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 5, pointerEvents: "none" }}>
        <svg width="40" height="40">
          <line x1="0" y1="20" x2="40" y2="20" stroke="#00ff99" strokeWidth="2" opacity="0.7" />
          <line x1="20" y1="0" x2="20" y2="40" stroke="#00ff99" strokeWidth="2" opacity="0.7" />
          <circle cx="20" cy="20" r="15" stroke="#00ff99" strokeWidth="1" fill="none" opacity="0.5" />
        </svg>
      </div>

      {/* Motion permission button always visible until clicked */}
      {!motionReady && (
        <button
          onClick={enableMotion}
          style={{
            position: "fixed",
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
