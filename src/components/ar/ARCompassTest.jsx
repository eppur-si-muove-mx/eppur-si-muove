"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { raDecToAltAz } from "@/lib/astro/projection";
import { CelestialDataManager } from "@/utils/data/celestialDataManager";
import ARMotionOverlay from "@/components/ar/ARMotionOverlay";


// 3D Horizon Bezel: ring + ticks + cardinal + numeric labels
function addHorizonBezel(scene, camera, {
    radius = 100,
    ringWidth = 2,
    tickEvery = 10,
    longEvery = 30,
    labelEvery = 30,
    colorRing = 0x88aacc,
    colorTick = 0xb4dcff,
    colorCardinal = "rgba(200,230,255,0.95)",
    colorLabel = "rgba(200,230,255,0.95)",
} = {}) {
    const group = new THREE.Group();
    group.name = "HorizonBezel";
    scene.add(group);

    // --- Ring (in the XZ plane, y=0) ---
    // RingGeometry is in XY, rotate to XZ
    // const ring = new THREE.Mesh(
    //     new THREE.RingGeometry(radius - ringWidth, radius + ringWidth, 256),
    //     new THREE.MeshBasicMaterial({ color: colorRing, side: THREE.DoubleSide, transparent: true, opacity: 0.35 })
    // );
    // ring.rotation.x = Math.PI / 2;
    // group.add(ring);

    // -- Outline Ring --
    function makeOutlineRing(radius, segments = 256, color = 0x88aacc, opacity = 0.9, yPosition = 0) {
        const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2, false, 0);
        const points = curve.getPoints(segments);
        const geom = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
        const loop = new THREE.LineLoop(geom, mat);
        loop.rotation.x = Math.PI / 2; // put it on the XZ plane (y=0)
        loop.position.y = yPosition;
        return loop;
    }

    // usage inside addHorizonBezel(...)
    const outlineRingTop = makeOutlineRing(radius, 256, 0x88aacc, 0.9, 3);
    group.add(outlineRingTop);
    const outlineRingBottom = makeOutlineRing(radius, 256, 0x88aacc, 0.9, -3.5);
    group.add(outlineRingBottom);

    // --- Tick marks ---
    // SETTINGS you should share with the ring:
    const yOffset = 0;      // use the SAME y as your ring (e.g., 5 if you moved it up)
    const bandWidth = 1.0;    // if you draw the horizon as a thin band ring
    const gap = 0.5;    // tiny gap from the ring edge so ticks don’t overlap
    const placeOutside = true; // put ticks just outside the ring

    // Tick style:
    // const shortHeight = 10;     // vertical height in world units
    // const longHeight = 0;
    // const tickThickness = 0.2;   // thin on X/Z
    // const alignMode = "center"; // "base" or "center"

    // const tickMat = new THREE.MeshBasicMaterial({
    //     color: colorTick,
    //     transparent: true,
    //     opacity: 0.85
    // });

    // for (let az = 0; az < 360; az += tickEvery) {
    //     const isLong = (az % longEvery) === 0;
    //     const height = isLong ? longHeight : shortHeight;
    //     const theta = THREE.MathUtils.degToRad(az);

    //     // RADIAL PLACEMENT — match your ring’s radius
    //     // If your ring is a band: inner = radius - bandWidth/2, outer = radius + bandWidth/2
    //     // Tick radius just outside (or inside) that band:
    //     const rTick = placeOutside
    //         ? radius + bandWidth / 2 + gap
    //         : radius - bandWidth / 2 - gap;

    //     const x = rTick * Math.sin(theta);
    //     const z = -rTick * Math.cos(theta);

    //     // GEOMETRY — vertical post (tall in Y, thin in X/Z)
    //     const tick = new THREE.Mesh(
    //         new THREE.BoxGeometry(tickThickness, height, tickThickness),
    //         tickMat
    //     );

    //     // Y PLACEMENT
    //     // "base": base sits on horizon plane -> center is at yOffset + height/2
    //     // "center": center aligns with horizon plane -> center is at yOffset
    //     const yCenter = (alignMode === "base") ? (yOffset + height / 2) : yOffset;

    //     tick.position.set(x, yCenter, z);
    //     // No rotation needed for vertical posts
    //     group.add(tick);
    // }


    // --- Label helpers (sprites render crisp and face camera automatically) ---
    function makeLabelSprite(text, {
        fontSize = 46,           // logical px (we’ll upscale canvas for retina)
        color = colorLabel,
        fontFamily = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        padding = 8,
        pxPerUnit = 80,         // controls sprite physical size in world units
    } = {}) {
        const scale = 2; // retina
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        ctx.font = `${fontSize * scale}px ${fontFamily}`;
        const metrics = ctx.measureText(text);
        canvas.width = Math.ceil(metrics.width + padding * 2 * scale);
        canvas.height = Math.ceil(fontSize * scale + padding * 2 * scale);
        ctx.font = `${fontSize * scale}px ${fontFamily}`;
        ctx.fillStyle = color;
        ctx.textBaseline = "top";
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 6 * scale;
        ctx.fillText(text, padding * scale, padding * scale);

        const tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;

        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(canvas.width / pxPerUnit, canvas.height / pxPerUnit, 1);
        return sprite;
    }

    // --- Cardinal letters ---
    const cardinals = [
        { label: "N", az: 0, color: colorCardinal },
        { label: "E", az: 90, color: colorLabel },
        { label: "S", az: 180, color: colorLabel },
        { label: "W", az: 270, color: colorLabel },
    ];

    cardinals.forEach(({ label, az, color }) => {
        const theta = THREE.MathUtils.degToRad(az);
        const rLab = radius + 16; // outside the ring
        const x = rLab * Math.sin(theta);
        const z = -rLab * Math.cos(theta);
        const s = makeLabelSprite(label, { fontSize: 160, color });
        s.position.set(x, 10, z);
        group.add(s);
    });

    // --- Numeric azimuth labels every 30° (0..330) ---
    for (let az = 0; az < 360; az += labelEvery) {
        const theta = THREE.MathUtils.degToRad(az);
        const rLab = radius + 10;
        const x = rLab * Math.sin(theta);
        const z = -rLab * Math.cos(theta);
        const s = makeLabelSprite(String(az), { fontSize: 200 });
        s.position.set(x, 0, z);
        group.add(s);
    }

    // Ensure label sprites are drawn on top a bit
    group.children.forEach(obj => { obj.renderOrder = 2; });

    // Optional: keep sprites facing the camera (Sprites do this already),
    // but if you ever swap to PlaneGeometry labels, expose this:
    group.userData.faceCamera = () => {
        group.traverse(obj => {
            if (obj.isSprite) obj.quaternion.copy(camera.quaternion);
        });
    };

    return group;
}



export default function ARStarAR({
    fovDeg = 65,
    smoothing = 0.2,
    maxStars = 600,           // tune this
    onEnableCamera,
    motionStatus,
    cameraActive,
    onSearchNewHome,
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
                try { await DME.requestPermission(); } catch { }
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

        const camera = new THREE.PerspectiveCamera(fovDeg, width / height, 0.01, 5000);

        const renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            powerPreference: "high-performance",
            preserveDrawingBuffer: false,
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(new THREE.Color(0x000814), 0.75);
        mountRef.current.appendChild(renderer.domElement);

        Object.assign(renderer.domElement.style, {
            position: "absolute",
            inset: "0",
            width: "100%",
            height: "100%",
            willChange: "transform",
            transform: "translateZ(0)",
        });

        // Bezel
        // after scene/camera/renderer are created
        const bezel = addHorizonBezel(scene, camera, {
            radius: 100,
            // tweak colors/sizes here if you like
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
        // addCardinal(0, 0xff4d4d);   // N
        // addCardinal(90, 0x33ff99);  // E
        // addCardinal(180, 0x6699ff); // S
        // addCardinal(270, 0xfff066); // W

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
                const azRad = THREE.MathUtils.degToRad(azimuth);

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
            geom.setAttribute("color", new THREE.Float32BufferAttribute(colTrim, 3));
            geom.setAttribute("size", new THREE.Float32BufferAttribute(sizTrim, 1));

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

            // 👇 Add this part
            const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            const heading = ((Math.atan2(fwd.x, -fwd.z) * 180) / Math.PI + 360) % 360;

            setDebug((d) => ({
                ...d,
                alpha: +alphaDeg.toFixed(1),
                beta: +betaDeg.toFixed(1),
                gamma: +gammaDeg.toFixed(1),
                screen: screenAngleDeg,
                heading, // now always available for overlay
            }));
        }


        // ---- Animation loop ----
        function loop() {
            updateCamera();
            // keep labels nicely facing camera (redundant for Sprites but safe)
            bezel.userData.faceCamera?.();
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

            <ARMotionOverlay
                enableMotion={enableMotion}
                debug={debug}
                onEnableCamera={onEnableCamera}
                motionStatus={motionStatus}
                cameraActive={cameraActive}
                onSearchNewHome={onSearchNewHome}
            />
        </>
    );
}
