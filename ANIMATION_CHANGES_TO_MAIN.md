# Animation Changes To Implement On Main

This file compares the current `ui` branch against the freshly fetched `origin/main` branch and lists the animation/perceived-load changes that should be ported to main.

Current comparison point:

- Source branch: `ui` at `c681ecb` (`Update UI transition flow`)
- Target branch: `origin/main` at `fd40344` (`Integrate terrain workbench motion and Taiwan environment`)
- Remote main was fetched with `git fetch origin main`

Important: do not blindly copy the whole `ui` branch into main. The `ui` branch contains animation work, but it also removes main's newer terrain architecture. Main currently has `MappedTerrainVehicleScene`, `HormuzDesertVehicleScene`, `TaiwanHumidVehicleScene`, and the Mesr/Taiwan terrain files. Keep those unless the product owner explicitly wants to delete the main terrain work.

## What To Port

Port these animation/perceived-load changes:

1. Landing page selection should reveal a `Simulate` button instead of navigating immediately.
2. Clicking `Simulate` should start a globe zoom-in transition before route navigation.
3. The landing globe should stay mounted behind mission pages so returning to the globe is instant.
4. The default tank scene should be prewarmed before navigation to reduce the mission-page stutter.
5. Vehicle scenes should start from a pulled-back camera and zoom into their final framed position.
6. The globe should hide pins/rings during the route transition and lock controls so users cannot interrupt the zoom.
7. Optional: remove React StrictMode in development if duplicate mount effects are causing local stutter.
8. Optional: port the top timeline rail and vehicle toggle micro-interactions, but keep main's simulation run flow unless intentionally redesigning it.

## What Not To Port Blindly

Do not copy these `ui` changes directly into main as part of the animation port:

- Deletion of `src/components/MappedTerrainVehicleScene.jsx`
- Deletion of `src/components/HormuzDesertVehicleScene.jsx`
- Deletion of `src/components/TaiwanHumidVehicleScene.jsx`
- Deletion of `src/terrains/iran_mesr_desert_topo_terrain.js`
- Deletion of `src/terrains/taiwan_humid_topo_terrain.js`
- Deletion of `public/terrains/iran_mesr_desert_topo_terrain.*`
- Deletion of `public/terrains/taiwan_humid_topo_terrain.*`
- Removal of `runToken` from `TheaterWorkbench`, `TheaterEnvironment`, and the terrain scenes

Reason: main's latest branch added multi-theater terrain-backed vehicle motion. The `ui` branch simplified that down to the Thompson/arctic scene only. If you copy the full `ui` scene files, Hormuz and Taiwan will lose their mapped terrain behavior, and the `Run Simulation` route/contact-effect motion from main will be removed.

## Implementation Order

Use this order on a new branch from main:

```bash
git checkout main
git pull origin main
git checkout -b animation-port-from-ui
```

Then implement the changes in this order:

1. Add the route-transition state and persistent route layers in `src/App.jsx`.
2. Add the globe zoom transition props/effect in `src/components/LandingGlobe.jsx`.
3. Add the route-layer and simulate-button CSS in `src/styles.css`.
4. Add entry camera zoom to `src/components/VehicleScene.jsx`.
5. Add entry camera zoom to main's `src/components/MappedTerrainVehicleScene.jsx`.
6. Add default tank prewarm carefully. Use the main-safe adaptation below, not a blind replacement of `ThompsonPassVehicleScene.jsx`.
7. Optional: add `MissionTimeline`, `timeline-rail.tsx`, and the top vehicle toggle.
8. Run verification.

## 1. App Route Transition

Target file: `src/App.jsx`

Main currently navigates immediately when a theater chip is clicked. The `ui` branch changes that into:

- select theater/custom point
- reveal `Simulate`
- prewarm tank scene
- start globe zoom
- navigate after the zoom duration
- keep landing mounted in a hidden route layer

### Imports

Change the imports at the top of `src/App.jsx`.

Main currently has:

```jsx
import { useMemo, useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
```

Change to:

```jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
```

Add the preloader import. If you use the main-safe preload adaptation below, the export can remain on `ThompsonPassVehicleScene.jsx`.

```jsx
import { preloadDefaultTankScene } from "./components/ThompsonPassVehicleScene";
```

### Timing Constants

Use the current `ui` branch timing:

```jsx
const CUSTOM_ACCENT = "#22c55e";
const TRANSITION_ZOOM_MS = 900;
const POST_ZOOM_HOLD_MS = 0;
const TRANSITION_NAV_MS = TRANSITION_ZOOM_MS + POST_ZOOM_HOLD_MS;
```

Do not add a post-zoom hold unless the product owner asks for it again. The latest requested state was no hold after zoom.

### LandingPage Signature

Change:

```jsx
function LandingPage() {
  const navigate = useNavigate();
```

To:

```jsx
function LandingPage({ routeTransition, onBeginRouteTransition }) {
```

Do not call `useNavigate` inside `LandingPage` anymore. Navigation should be centralized in `App` so the globe can animate before the route changes.

### LandingPage State

Add this state next to the existing selection state:

```jsx
const [showSimulate, setShowSimulate] = useState(false);
```

Add this mount effect:

```jsx
useEffect(() => {
  preloadDefaultTankScene();
}, []);
```

Purpose: start warming the default tank scene as soon as the landing page is visible, before the user clicks `Simulate`.

### Selected Accent

Add this after `focusLatLng`:

```jsx
const selectedAccent =
  activeKind === "custom"
    ? CUSTOM_ACCENT
    : theaterList.find((t) => t.id === presetId)?.accent ?? CUSTOM_ACCENT;
```

### Selected Mission Helper

Add this helper inside `LandingPage`:

```jsx
function selectedMission() {
  if (activeKind === "custom" && custom) {
    return {
      id: "custom",
      path: `/mission/custom?lat=${custom.lat}&lng=${custom.lng}`,
      target: { lat: custom.lat, lng: custom.lng },
    };
  }

  const theater = theaterList.find((t) => t.id === presetId);
  return {
    id: presetId,
    path: `/mission/${presetId}`,
    target: theater ? { lat: theater.lat, lng: theater.lng } : focusLatLng,
  };
}
```

The `target` is passed to `LandingGlobe` so the globe knows where to zoom.

### Selection Handlers

In all selection handlers, show the simulate button instead of navigating.

Use these behaviors:

```jsx
function handleSelectMarker(id) {
  if (id === "custom") {
    setActiveKind("custom");
  } else {
    setPresetId(id);
    setActiveKind("preset");
  }
  setShowSimulate(true);
}

function handleGlobeClick(lat, lng) {
  setCustom({ lat, lng });
  setActiveKind("custom");
  setShowSimulate(true);
}

function handleChipClick(id) {
  if (id === "custom") {
    setActiveKind("custom");
    setShowSimulate(true);
    return;
  }

  setPresetId(id);
  setActiveKind("preset");
  setShowSimulate(true);
}
```

Add the simulate click handler:

```jsx
function handleSimulateClick() {
  if (routeTransition) return;
  const mission = selectedMission();
  onBeginRouteTransition({
    path: mission.path,
    target: mission.target,
  });
}
```

### Landing Markup

Change the root class:

```jsx
<div className={`lf-landing-full${routeTransition ? " is-transitioning" : ""}`}>
```

Pass transition props into the globe:

```jsx
<LandingGlobe
  markers={markers}
  focusLatLng={focusLatLng}
  transitionTarget={routeTransition?.target}
  transitionDuration={TRANSITION_ZOOM_MS}
  onSelectMarker={handleSelectMarker}
  onGlobeClick={handleGlobeClick}
/>
```

Render the simulate button inside the overlay, after the picker/hint area:

```jsx
{showSimulate && (
  <button
    type="button"
    className="lf-simulate-button"
    style={{ "--lf-simulate-accent": selectedAccent }}
    disabled={Boolean(routeTransition)}
    onClick={handleSimulateClick}
  >
    Simulate
  </button>
)}
```

### App Component

Replace the simple `Routes` return with a persistent two-layer shell.

Add this state and callback in `App`:

```jsx
const navigate = useNavigate();
const location = useLocation();
const [routeTransition, setRouteTransition] = useState(null);
const isLandingRoute = location.pathname === "/";

const beginRouteTransition = useCallback((next) => {
  preloadDefaultTankScene();
  setRouteTransition((current) => {
    if (current) return current;
    return {
      id: Date.now(),
      path: next.path,
      target: next.target,
    };
  });
}, []);
```

Add the navigation timer:

```jsx
useEffect(() => {
  if (!routeTransition) return undefined;

  const navigateTimer = window.setTimeout(() => {
    navigate(routeTransition.path);
    setRouteTransition(null);
  }, TRANSITION_NAV_MS);

  return () => {
    window.clearTimeout(navigateTimer);
  };
}, [navigate, routeTransition?.id, routeTransition?.path]);
```

Use this return shape:

```jsx
return (
  <div className="app-shell">
    <div
      className="app-route-layer"
      data-active={isLandingRoute}
      aria-hidden={!isLandingRoute}
    >
      <LandingPage
        routeTransition={routeTransition}
        onBeginRouteTransition={beginRouteTransition}
      />
    </div>

    <div
      className="app-route-layer app-route-layer--mission"
      data-active={!isLandingRoute}
      aria-hidden={isLandingRoute}
    >
      {!isLandingRoute && (
        <Routes>
          <Route path="/mission/:theaterId" element={<TheaterWorkbench />} />
        </Routes>
      )}
    </div>
  </div>
);
```

Why this matters: the landing page and globe are always mounted in the background. Returning from `/mission/...` to `/` does not recreate the globe and avoids the large delay that was visible before.

## 2. Landing Globe Zoom Transition

Target file: `src/components/LandingGlobe.jsx`

Main currently only focuses to the selected marker with a normal `pointOfView` call. The `ui` branch adds a route-transition zoom into the selected theater before navigation.

### Imports

Change:

```jsx
import { useEffect, useRef, useState } from "react";
import Globe from "react-globe.gl";
```

To:

```jsx
import { useCallback, useEffect, useRef, useState } from "react";
import Globe from "react-globe.gl";
import * as THREE from "three";
```

### Constants

Add:

```jsx
const CLOSE_TRANSITION_ALTITUDE = 0.003;
const MAX_BASE_PIXEL_RATIO = 2;
const EARTH_TEXTURE_URL = "https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/january/world.200401.3x21600x10800.jpg";
const EARTH_BUMP_URL = "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png";
```

The close altitude is intentionally tiny. It creates the "zoom into the selected theater" transition before the route changes.

### Props

Change the component signature to:

```jsx
export function LandingGlobe({
  markers,
  focusLatLng,
  transitionTarget,
  transitionDuration = 1500,
  onSelectMarker,
  onGlobeClick,
}) {
```

### Quality Tuning

Add this callback inside the component:

```jsx
const tuneGlobeQuality = useCallback(() => {
  const globe = globeRef.current;
  if (!globe) return;

  const renderer = globe.renderer?.();
  const maxAnisotropy = renderer?.capabilities?.getMaxAnisotropy?.() ?? 1;

  renderer?.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, MAX_BASE_PIXEL_RATIO),
  );

  const camera = globe.camera?.();
  if (camera) {
    camera.near = 0.02;
    camera.updateProjectionMatrix();
  }

  const material = globe.globeMaterial?.();
  if (!material) return;

  material.bumpScale = 3.2;
  material.shininess = 9;
  for (const texture of [material.map, material.bumpMap, material.specularMap]) {
    if (!texture) continue;
    texture.anisotropy = maxAnisotropy;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
  }
  material.needsUpdate = true;
}, []);
```

### Focus Animation

Main uses a slower focus tween. The `ui` branch makes normal marker focus faster and prevents normal focus from fighting the route-transition zoom.

Use this effect:

```jsx
useEffect(() => {
  if (!globeRef.current || !focusLatLng || transitionTarget) return;
  const raf = window.requestAnimationFrame(() => {
    globeRef.current?.pointOfView(
      { lat: focusLatLng.lat, lng: focusLatLng.lng, altitude: 1.55 },
      420,
    );
  });
  return () => window.cancelAnimationFrame(raf);
}, [focusLatLng, transitionTarget]);
```

### Route Transition Zoom

Add this effect:

```jsx
useEffect(() => {
  if (!globeRef.current || !transitionTarget) return undefined;

  const globe = globeRef.current;
  const controls = globe.controls();
  const wasAutoRotating = controls.autoRotate;
  const wasEnabled = controls.enabled;
  const wasDampingEnabled = controls.enableDamping;

  controls.autoRotate = false;
  controls.enabled = false;
  controls.enableDamping = false;

  globe.pointOfView(
    {
      lat: transitionTarget.lat,
      lng: transitionTarget.lng,
      altitude: CLOSE_TRANSITION_ALTITUDE,
    },
    transitionDuration,
  );

  return () => {
    controls.autoRotate = wasAutoRotating;
    controls.enabled = wasEnabled;
    controls.enableDamping = wasDampingEnabled;
  };
}, [transitionDuration, transitionTarget]);
```

Note: the current `ui` code includes `tuneGlobeQuality` in this dependency array even though the effect does not use it. Do not include unused dependencies when porting.

### Hide Markers During Route Transition

Replace:

```jsx
const ringsData = markers.filter((m) => m.selected);
```

With:

```jsx
const isTransitioning = Boolean(transitionTarget);
const ringsData = isTransitioning ? [] : markers.filter((m) => m.selected);
const htmlElementsData = isTransitioning ? [] : markers;
```

Then pass `htmlElementsData={htmlElementsData}` instead of `htmlElementsData={markers}`.

### Globe Props

Use these prop changes on the `Globe` component:

```jsx
rendererConfig={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
waitForGlobeReady
animateIn={false}
backgroundColor="rgba(0,0,0,0)"
globeImageUrl={EARTH_TEXTURE_URL}
bumpImageUrl={EARTH_BUMP_URL}
globeCurvatureResolution={1.25}
atmosphereColor="#7dd3fc"
atmosphereAltitude={0}
onGlobeReady={tuneGlobeQuality}
```

Change the click handler so custom clicks are ignored while the route zoom is running:

```jsx
onGlobeClick={({ lat, lng }) => {
  if (!transitionTarget) onGlobeClick(lat, lng);
}}
```

## 3. CSS For Route Layers And Simulate Button

Target file: `src/styles.css`

Add this near the global/base styles:

```css
.app-shell {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: var(--bg);
}

.app-route-layer {
  position: fixed;
  inset: 0;
  z-index: 1;
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
}

.app-route-layer[data-active="true"] {
  visibility: visible;
  opacity: 1;
  pointer-events: auto;
}

.app-route-layer--mission {
  z-index: 2;
}
```

These layers intentionally do not animate opacity. The latest requested state removed the blur/fade transition and kept the page swap instant after the globe zoom finishes.

Update `.lf-picker`:

```css
.lf-picker {
  order: 3;
  margin-top: auto;
  align-self: center;
  display: flex;
  gap: 8px;
  max-width: min(92vw, 760px);
  overflow-x: auto;
  background: rgba(5,8,16,0.55);
  border: 1px solid rgba(136,209,255,0.22);
  border-radius: 999px;
  padding: 8px;
}

.lf-overlay:has(.lf-simulate-button) .lf-picker {
  margin-top: 0;
}
```

Add the simulate button styles:

```css
.lf-simulate-button {
  order: 2;
  align-self: center;
  margin-top: auto;
  margin-bottom: 10px;
  min-width: 112px;
  border: 1px solid var(--lf-simulate-accent, var(--accent));
  border-radius: 999px;
  background: var(--lf-simulate-accent, var(--accent));
  color: #07101f;
  padding: 8px 16px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  box-shadow: 0 0 22px var(--lf-simulate-accent, var(--accent));
  transition: transform 140ms ease, filter 140ms ease;
}

.lf-simulate-button:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.lf-simulate-button:active {
  transform: translateY(0);
}

.lf-simulate-button:disabled {
  cursor: wait;
  filter: brightness(1.02);
}
```

Update `.lf-stars-canvas` and `.lf-globe` to include GPU-friendly transition metadata:

```css
.lf-stars-canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: radial-gradient(ellipse at center, #0e1c3a 0%, #050810 70%);
  transition: opacity 200ms ease, filter 200ms ease, transform 200ms ease;
  will-change: opacity, filter, transform;
}

.lf-globe {
  position: absolute;
  inset: 0;
  z-index: 1;
  transform-origin: center center;
  transition: opacity 200ms ease, filter 200ms ease, transform 200ms ease;
  will-change: opacity, filter, transform;
}
```

Do not add blur transitions. The latest requested state explicitly removed the blur/fade effect.

## 4. Entry Camera Zoom For Generic VehicleScene

Target file: `src/components/VehicleScene.jsx`

This file is used for non-terrain fallback/custom scenes. Port the entry zoom exactly.

Add constants below `VEHICLE_FACTORIES`:

```jsx
const ENTRY_ZOOM_MS = 850;
const ENTRY_ZOOM_DISTANCE = 2.25;

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}
```

After `camera.position.set(...)` and `camera.lookAt(...)`, add:

```jsx
const targetPosition = new THREE.Vector3(0, verticalAim, 0);
const finalCameraPosition = camera.position.clone();
const entryCameraPosition = targetPosition
  .clone()
  .add(finalCameraPosition.clone().sub(targetPosition).multiplyScalar(ENTRY_ZOOM_DISTANCE));
camera.position.copy(entryCameraPosition);
camera.lookAt(targetPosition);
```

Change controls target from:

```jsx
controls.target.set(0, verticalAim, 0);
```

To:

```jsx
controls.target.copy(targetPosition);
```

Change initial autorotate:

```jsx
controls.autoRotate = false;
controls.autoRotateSpeed = 0.6;
const entryStartedAt = performance.now();
```

In `tick(now)`, before `controls.update()`, add:

```jsx
const entryProgress = Math.min(1, (now - entryStartedAt) / ENTRY_ZOOM_MS);
if (entryProgress < 1) {
  camera.position.lerpVectors(
    entryCameraPosition,
    finalCameraPosition,
    easeOutCubic(entryProgress),
  );
  camera.lookAt(targetPosition);
} else if (!userInteracting) {
  controls.autoRotate = true;
}
```

Do not remove the existing asset update call:

```jsx
if (asset && typeof asset.update === "function") {
  asset.update(dt);
}
```

## 5. Entry Camera Zoom For Main's Mapped Terrain Scene

Target file on main: `src/components/MappedTerrainVehicleScene.jsx`

Do not replace this file with the `ui` branch's `ThompsonPassVehicleScene.jsx`. Main's `MappedTerrainVehicleScene` contains route animation, terrain following, and dust/mist/snow contact effects. Instead, add entry zoom into this main file.

Add constants near the existing constants:

```jsx
const ENTRY_ZOOM_MS = 850;
const ENTRY_ZOOM_DISTANCE = 2.15;

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}
```

In main, the camera setup currently does this:

```jsx
const camera = new THREE.PerspectiveCamera(48, 1, 0.05, 2400);
const vehicleRadius = Math.max(size.x, size.y, size.z) * 0.5;
const frameDistance = Math.max(9, vehicleRadius * 4.8);
const targetLift = vehicleId === "drone" ? 8 : Math.max(1.1, size.y * 0.45);
const initialTarget = new THREE.Vector3(
  initialRouteSample.x,
  initialTerrainHeight + targetLift,
  initialRouteSample.z,
);
camera.position.set(
  initialTarget.x + frameDistance * 0.95,
  initialTarget.y + frameDistance * 0.42,
  initialTarget.z + frameDistance * 1.25,
);
camera.lookAt(initialTarget);
```

Immediately after `camera.lookAt(initialTarget);`, add:

```jsx
const finalCameraPosition = camera.position.clone();
const entryCameraPosition = initialTarget
  .clone()
  .add(finalCameraPosition.clone().sub(initialTarget).multiplyScalar(ENTRY_ZOOM_DISTANCE));
camera.position.copy(entryCameraPosition);
camera.lookAt(initialTarget);
```

After `controls.update();`, add:

```jsx
const entryStartedAt = performance.now();
```

Inside `tick(now)`, main already moves the camera and controls target to follow the route:

```jsx
const desiredTarget = new THREE.Vector3(
  routeSample.x,
  groundHeight + targetLift,
  routeSample.z,
);
const followAlpha = 1 - Math.exp(-dt * 2.2);
const targetDelta = desiredTarget.clone().sub(controls.target).multiplyScalar(followAlpha);
controls.target.add(targetDelta);
camera.position.add(targetDelta);
```

Keep that code. Then, before `controls.update();`, add entry zoom logic that also respects route-follow movement:

```jsx
const entryProgress = Math.min(1, (now - entryStartedAt) / ENTRY_ZOOM_MS);
if (entryProgress < 1) {
  const eased = easeOutCubic(entryProgress);
  const currentEntryStart = controls.target
    .clone()
    .add(finalCameraPosition.clone().sub(initialTarget).multiplyScalar(ENTRY_ZOOM_DISTANCE));
  const currentEntryEnd = controls.target
    .clone()
    .add(finalCameraPosition.clone().sub(initialTarget));

  camera.position.lerpVectors(currentEntryStart, currentEntryEnd, eased);
  camera.lookAt(controls.target);
}
```

Why this uses `controls.target`: main's terrain scene may move the target during route animation. If you lerp against the original static `initialTarget` forever, the camera can snap or drift when route motion is active.

Keep these main behaviors:

- `runToken`
- `runActive`
- `routeDistance`
- contact effects
- `asset.update(dt)` while running
- terrain normal alignment
- `className = "mapped-terrain-scene"`

## 6. Default Tank Prewarm

Target files:

- `src/App.jsx`
- `src/components/ThompsonPassVehicleScene.jsx`
- possibly `src/components/MappedTerrainVehicleScene.jsx`

The `ui` branch implements prewarm by replacing `ThompsonPassVehicleScene.jsx` with a standalone scene builder that caches the Thompson world, clones the default UGV model, creates a WebGL renderer, renders a 96 x 96 frame, and then reuses that bundle when the mission page mounts.

That exact implementation works in `ui`, but copying it wholesale into main would bypass main's generic mapped terrain architecture. Use one of the two approaches below.

### Recommended Main-Safe Approach

Preserve main's architecture and add a reusable bundle creator to `MappedTerrainVehicleScene.jsx`.

Step 1: Extract scene creation from the `useEffect`.

Create an exported helper in `MappedTerrainVehicleScene.jsx`:

```jsx
export function createMappedTerrainVehicleSceneBundle({
  vehicleId,
  effectType = "dust",
  addWorld,
  renderHeightMetersAt,
  terrainNormalAt,
  deploymentPoint = DEFAULT_DEPLOYMENT_POINT,
  routeOffsets = DEFAULT_ROUTE_OFFSETS,
}) {
  // Move the scene/camera/renderer/vehicle/contactEffect setup code from the useEffect here.
  // Return every value the effect needs.
}
```

The returned bundle must include at minimum:

```jsx
{
  scene,
  camera,
  renderer,
  route,
  speed,
  texture,
  pad,
  vehicleMount,
  asset,
  contactEffect,
  vehicleRadius,
  targetLift,
  initialTarget,
  finalCameraPosition,
  entryCameraPosition,
}
```

Step 2: Change `MappedTerrainVehicleScene` to call the helper inside `useEffect`.

Inside the effect, replace duplicated construction with:

```jsx
const bundle = createMappedTerrainVehicleSceneBundle({
  vehicleId,
  effectType,
  addWorld,
  renderHeightMetersAt,
  terrainNormalAt,
  deploymentPoint,
  routeOffsets,
});
```

Then destructure the bundle and keep all existing resize, tick, route, and cleanup logic.

Step 3: Export a Thompson-specific preloader from `ThompsonPassVehicleScene.jsx`.

Keep main's wrapper component, but add preload state above it:

```jsx
import { MappedTerrainVehicleScene, createMappedTerrainVehicleSceneBundle } from "./MappedTerrainVehicleScene";
import {
  addThompsonPassSnowTopoWorld,
  renderHeightMetersAt,
  terrainNormalAt,
} from "../terrains/thompson_pass_snow_topo_terrain";

const DEFAULT_TANK_ID = "ugv";

let defaultTankSceneBundle = null;
let defaultTankPreloadPromise = null;

export function preloadDefaultTankScene() {
  if (typeof window === "undefined") return Promise.resolve();
  if (defaultTankPreloadPromise) return defaultTankPreloadPromise;

  defaultTankPreloadPromise = new Promise((resolve) => {
    const warm = () => {
      try {
        defaultTankSceneBundle = createMappedTerrainVehicleSceneBundle({
          vehicleId: DEFAULT_TANK_ID,
          effectType: "snow",
          addWorld: addThompsonPassSnowTopoWorld,
          renderHeightMetersAt,
          terrainNormalAt,
        });
        defaultTankSceneBundle.renderer.setPixelRatio(1);
        defaultTankSceneBundle.renderer.setSize(96, 96, false);
        defaultTankSceneBundle.renderer.render(
          defaultTankSceneBundle.scene,
          defaultTankSceneBundle.camera,
        );
      } catch (error) {
        console.warn("Default tank preload failed", error);
      } finally {
        resolve();
      }
    };

    window.setTimeout(warm, 0);
  });

  return defaultTankPreloadPromise;
}
```

Step 4: Reuse or dispose the prewarmed bundle carefully.

If you reuse `defaultTankSceneBundle` in the mounted component, make sure:

- The renderer DOM element is appended only once.
- The bundle has an `inUse` flag.
- Cleanup detaches the canvas but does not dispose the cached renderer/scene.
- If the component creates a non-cached bundle, cleanup disposes it normally.

If this feels too risky during the hackathon, keep the preloader as a warm render only and let the actual page create its own live scene. That still reduces shader/texture/WebGL startup stutter without risking shared-resource disposal bugs.

### Fast But Risky Approach

Copy `ui`'s entire `src/components/ThompsonPassVehicleScene.jsx` into main. This gives the exact current prewarm behavior but removes main's route simulation for the arctic scene and makes Thompson special instead of using `MappedTerrainVehicleScene`.

Only do this if the team accepts losing the generic main terrain route behavior in Thompson.

## 7. TheaterWorkbench Changes

Target file: `src/components/TheaterWorkbench.jsx`

The `ui` branch changes the workbench top bar:

- removes the separate vehicle side button
- adds a top vehicle toggle that shows the current vehicle name
- adds the mission timeline rail beside the theater coordinates
- removes `runToken` and `Run Simulation`

For main, be careful: removing `runToken` also removes main's animated route run. If the goal is animation-only, keep `runToken`.

### Safe Version For Main

Keep this state:

```jsx
const [runToken, setRunToken] = useState(0);
```

Keep passing it:

```jsx
<TheaterEnvironment
  theaterId={theaterIdForSim}
  vehicleId={vehicleId}
  runToken={runToken}
/>
```

You may still add the top vehicle toggle:

```jsx
const toggleVehicle = () => setVehicleId((current) => (current === "ugv" ? "drone" : "ugv"));
```

And render:

```jsx
<button
  type="button"
  className="vehicle-top-toggle"
  onClick={toggleVehicle}
  title="Switch vehicle"
>
  <span>Vehicle</span>
  <strong>{vehicle.label}</strong>
</button>
```

If there is no room in the top bar, keep `Run Simulation` too:

```jsx
<button
  type="button"
  className="run-sim-button"
  onClick={() => setRunToken((token) => token + 1)}
>
  Run Simulation
</button>
```

Do not remove `PANELS` vehicle entry unless the product owner confirms the new top toggle replaces it.

## 8. Mission Timeline Rail

Files to add if porting the timeline:

- `src/components/MissionTimeline.jsx`
- `src/components/ui/timeline-rail.tsx`
- `src/lib/utils.ts`

Main already has the Vite alias:

```js
resolve: {
  alias: {
    "@": path.resolve(__dirname, "./src"),
  },
}
```

So the import below is valid:

```jsx
import TimelineRail from "@/components/ui/timeline-rail";
```

The timeline component is mostly UI, but it includes small dot/rail transitions through Tailwind classes:

```tsx
"relative rounded-full ring-2 ring-black/5 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
```

If you add it, copy the exact files from `ui`. Then add the CSS from `ui`:

```css
.mission-timeline {
  flex: 1;
  max-width: min(720px, calc(100vw - 660px));
  min-width: 420px;
  height: 78px;
  padding: 8px 18px 10px;
  overflow: hidden;
  border: 1px solid rgba(136,209,255,0.20);
  background: rgba(8,12,24,0.58);
  backdrop-filter: blur(12px);
  border-radius: 10px;
  box-shadow: 0 14px 42px rgba(0,0,0,0.28);
}

.mission-timeline__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 12px;
  color: var(--muted);
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.mission-rail {
  margin-top: 30px;
}

.mission-rail__track {
  background: rgba(136,209,255,0.22);
}

.mission-rail [class*="bg-zinc-900"] {
  background: var(--accent) !important;
  box-shadow: 0 0 18px rgba(110,231,183,0.32);
}

.mission-rail__item {
  width: 104px;
  min-width: 0;
}

.mission-rail__dot {
  background: rgba(138,151,184,0.92);
  border: 1px solid rgba(230,237,255,0.36);
}

.mission-rail__dot--active {
  background: var(--accent);
  border-color: rgba(110,231,183,0.85);
  box-shadow: 0 0 14px rgba(110,231,183,0.42);
}

.mission-rail__label {
  max-width: 104px;
  overflow: hidden;
  text-overflow: ellipsis;
  color: rgba(230,237,255,0.70) !important;
  font-size: 9px !important;
  letter-spacing: 0.06em;
  text-align: center;
  text-transform: uppercase;
  white-space: nowrap;
  transform: translateY(-14px) rotate(0deg) !important;
}

.mission-rail__caption {
  color: rgba(230,237,255,0.84) !important;
  font-size: 10px !important;
  font-variant-numeric: tabular-nums;
  transform: translateY(11px) !important;
}
```

## 9. Vehicle Toggle CSS

If porting the top vehicle toggle, add:

```css
.vehicle-top-toggle {
  flex: 0 0 250px;
  height: 78px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  overflow: hidden;
  border: 1px solid rgba(110,231,183,0.32);
  background: rgba(8,12,24,0.58);
  backdrop-filter: blur(12px);
  border-radius: 10px;
  color: var(--text);
  text-align: left;
  box-shadow: 0 14px 42px rgba(0,0,0,0.28);
  transition: border-color 140ms ease, background 140ms ease;
}

.vehicle-top-toggle:hover {
  border-color: rgba(110,231,183,0.70);
  background: rgba(8,12,24,0.72);
}

.vehicle-top-toggle span {
  color: var(--muted);
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.vehicle-top-toggle strong {
  overflow: hidden;
  color: var(--accent);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

If keeping main's `Run Simulation` button, do not delete the existing `.run-sim-button` CSS.

## 10. React StrictMode

Target file: `src/main.jsx`

The `ui` branch removes `React.StrictMode`:

```jsx
ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
```

Reason: in development, StrictMode intentionally double-runs effects. For WebGL scenes, that can look like stutter or double initialization. Production builds are not affected by StrictMode in the same way.

Recommendation:

- If local demo smoothness is the priority, remove StrictMode.
- If strict React dev checks are the priority, keep StrictMode and make scene setup/cleanup idempotent.

## 11. CSS Class Warning For Terrain Scenes

The `ui` branch renamed terrain scene CSS from `.mapped-terrain-scene` to `.thompson-pass-scene` because it replaced the generic scene with a standalone Thompson scene.

On main, keep `.mapped-terrain-scene`.

Do not replace:

```css
.mapped-terrain-scene
```

with:

```css
.thompson-pass-scene
```

unless you also intentionally replace main's terrain architecture.

Safe main CSS should include:

```css
.lf-vehicle-scene,
.mapped-terrain-scene {
  position: absolute;
  inset: 0;
}

.mapped-terrain-scene::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.mapped-terrain-scene canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: grab;
  touch-action: none;
}

.lf-vehicle-scene canvas:active,
.mapped-terrain-scene canvas:active {
  cursor: grabbing;
}
```

## Verification Checklist

Run:

```bash
npm run build
```

Manual browser checks:

1. Open the landing page.
2. Click a theater marker or chip.
3. Confirm the page does not navigate immediately.
4. Confirm the `Simulate` button appears.
5. Click `Simulate`.
6. Confirm the globe zooms into the selected theater for about `900ms`.
7. Confirm markers/rings disappear during the zoom.
8. Confirm route navigation happens immediately after the zoom finishes.
9. Confirm there is no blur/fade hold after the zoom.
10. On the mission page, confirm the tank scene appears without the previous long blank/stutter.
11. Switch from UGV to Raven if the toggle was ported.
12. Confirm the vehicle scene uses entry zoom but does not pause asset updates.
13. If keeping main's run simulation, click `Run Simulation`.
14. Confirm the vehicle follows its route and contact effects still appear.
15. Navigate back to `/`.
16. Confirm the globe returns quickly because it stayed mounted.

Regression checks for main's terrain work:

1. `/mission/arctic` still uses Thompson snow terrain.
2. `/mission/hormuz` still uses desert terrain.
3. `/mission/taiwan` still uses humid terrain.
4. `MappedTerrainVehicleScene` still exists.
5. `HormuzDesertVehicleScene` still exists.
6. `TaiwanHumidVehicleScene` still exists.
7. `runToken` is still wired through `TheaterWorkbench` -> `TheaterEnvironment` -> mapped terrain scenes unless intentionally removed.

## Quick Diff Commands

Useful commands while porting:

```bash
git diff origin/main -- src/App.jsx
git diff origin/main -- src/components/LandingGlobe.jsx
git diff origin/main -- src/components/VehicleScene.jsx
git diff origin/main -- src/components/ThompsonPassVehicleScene.jsx
git diff origin/main -- src/components/TheaterWorkbench.jsx
git diff origin/main -- src/styles.css
```

Use these to inspect exact source-branch behavior, but apply the terrain-scene changes with the safe adaptation above.

## Final Porting Rule

For animation work, port behavior, not the entire file tree.

Safe to port directly:

- `App.jsx` route transition pattern
- `LandingGlobe.jsx` transition props/effects
- `VehicleScene.jsx` entry zoom
- route-layer/simulate-button CSS
- optional timeline files

Must be adapted:

- `ThompsonPassVehicleScene.jsx` preload behavior
- terrain scene entry zoom
- workbench top-bar changes

Must not be deleted from main:

- main's mapped terrain scene system
- main's theater terrain wrappers
- main's terrain data files
- main's route simulation token, unless replacing that feature intentionally
