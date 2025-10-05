## Eppur Si Muove – AR sky discovery demo

An experimental AR experience that overlays a stylized camera view with sky scanning UI. It combines the device camera, motion sensors (gyroscope/compass), and geolocation to “scan” the sky and surface nearby celestial objects. Today, several parts are simulated to make development and desktop testing easy; on a real device, it’s designed for iOS Safari.

---

## Run it locally

1) Install dependencies

```bash
npm install
```

2) Start the dev server

```bash
npm run dev
```

3) Open the AR experience

- Desktop: http://localhost:3000/ar-experience
- iPhone (recommended): see the HTTPS/ngrok section below.


---

## iOS Safari requires HTTPS (use ngrok)

For iOS Safari to grant access to the motion sensors, camera, and geolocation, the page must be served over HTTPS and user gesture permissions must be requested in-page. We suggest exposing your local dev server via an HTTPS tunnel like ngrok.

Steps (example using ngrok):

```bash
# In one terminal, run the app locally
npm run dev

# In another terminal, start an https tunnel to port 3000
ngrok http 3000
```

Open the generated https URL (e.g. https://your-subdomain.ngrok.io/ar-experience) in iOS Safari on your device.

Notes:
- On first use, Safari will ask to allow motion sensors, camera, and location. Accept the prompts.
- A user gesture is required to enable sensors; use the on-screen buttons to “Enable Motion” and “Enable Camera”.
- Best results on recent iOS Safari (16+). The app is currently designed and tested primarily for iOS Safari.

---

## What the app does

- Renders a full-viewport, stylized live camera feed (with a night-vision tint) behind the UI.
- Shows an AR UI with a reticle and a control overlay to enable motion sensors and camera.
- When you “scan,” it uses your device orientation and location to define a sky search area and returns nearby objects.
- Selecting a result opens a planet detail overlay where you can mark favorites, etc.

Entry point: `src/app/ar-experience/page.jsx`

Key components/hooks:
- `src/components/ARCameraView.jsx` – camera video feed rendered via Three.js as a textured full-screen quad
- `src/hooks/useCamera.js` – camera permission and stream management (with optional simulation)
- `src/hooks/useDeviceOrientation.js` – DeviceOrientation (iOS permission flow included)
- `src/hooks/useGeolocation.js` – geolocation permission and updates
- `src/components/ar/ScanHandler.jsx` – orchestrates a scan using orientation + GPS, shows progress overlay
- `src/contexts/DiscoveryContext.jsx` – mock planet list, discovery state, overlay control

---

## Usage tips

- iOS Safari: after opening the ngrok HTTPS URL, use the on-screen buttons to enable Motion and Camera. If denied, reload the page and try again.
- The “Search a new home” button triggers a scan. You can also press Space on desktop.
- A temporary debug panel appears when mock sensors are enabled (bottom-right) and shows the current alpha/beta/gamma values.

---

## Troubleshooting

- Sensors not responding on iOS Safari
  - Ensure you’re on HTTPS (via ngrok) and that you tapped the “Enable Motion” button
  - Check iOS Settings → Safari → Motion & Orientation Access is allowed

- Camera not starting
  - Ensure you tapped the “Enable Camera” button and granted permission
  - Close other apps using the camera

- No location
  - Allow location access when prompted; if needed, reload after granting

- Desktop testing: no sensors
  - Set `NEXT_PUBLIC_USE_MOCK_SENSORS=true` and use the keyboard controls

---
