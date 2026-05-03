# Page Transitions in This Project

## Overview

This document is both a description of the current implementation and a portability spec for applying the same transition behavior to older or future versions of this project.

The desired behavior is:

1. The home route shows an interactive globe.
2. Clicking `Simulate` does not navigate immediately.
3. The globe smoothly zooms into the selected theater/custom coordinate.
4. After the zoom finishes, the app switches to the mission page.
5. The switch itself should feel instant and clean. Do not add blur, heavy fade overlays, or extra delay unless explicitly requested.

The current smooth transition is built with:

- React Router for route state and navigation.
- React state in `src/App.jsx` for the transition object.
- `window.setTimeout()` for the route handoff timing.
- `react-globe.gl`'s `pointOfView()` camera API for the visible zoom.
- CSS route layers in `src/styles.css` for fullscreen page stacking.

There is no Framer Motion, GSAP, View Transitions API, or page-transition framework in this project.

When porting this behavior to another version, preserve the same contract even if component names have changed.

## Key Files

Current files:

- `src/main.jsx`: installs `BrowserRouter`.
- `src/App.jsx`: owns the route transition state, timer, and fullscreen route wrappers.
- `src/components/LandingGlobe.jsx`: owns the globe camera animation.
- `src/components/TheaterWorkbench.jsx`: mission-page route component and direct back navigation to `/`.
- `src/styles.css`: owns route-layer visibility, fullscreen layout, and small UI hover transitions.

Equivalent files in older/future versions:

- If `App.jsx` was split up, find the component that renders `<Routes>` and uses `useNavigate()`/`useLocation()`.
- If `LandingGlobe.jsx` was renamed, find the component that imports `react-globe.gl` and calls `pointOfView()`.
- If `TheaterWorkbench.jsx` was renamed, find the mission page component rendered for `/mission/:theaterId`.
- If CSS was moved, find global route shell styles for `.app-shell`, route layers, landing page, and globe container.

## How Navigation Triggers Transitions

### Current Router Setup

`src/main.jsx`

```jsx
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
```

### Transition Timing Constants

Keep these values unless the product owner explicitly asks for different timing. They are the current smooth-feeling values.

`src/App.jsx`

```jsx
const TRANSITION_ZOOM_MS = 900;
const POST_ZOOM_HOLD_MS = 0;
const TRANSITION_NAV_MS = TRANSITION_ZOOM_MS + POST_ZOOM_HOLD_MS;
```

Porting rule:

- `TRANSITION_ZOOM_MS` must match the duration passed to `LandingGlobe`.
- `POST_ZOOM_HOLD_MS` should stay `0` for the current instant handoff feel.
- Do not add a fade/blur transition between pages unless requested.

### Mission Path Selection

The landing page builds either a preset theater route or a custom coordinate route. Preserve this route shape when porting.

`src/App.jsx`

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

### Simulate Click Flow

The important part: `Simulate` starts transition state. It should not call `navigate()` directly.

`src/App.jsx`

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

Porting rule:

- Keep the duplicate-click guard: `if (routeTransition) return;`.
- Pass both `path` and `target`.
- `target` must contain `{ lat, lng }`.

### Transition State Creation

`App` stores one transition object and preloads the default tank scene before starting. This is part of the smoothness budget because it reduces mission-page stutter.

`src/App.jsx`

```jsx
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

Porting rule:

- If the project still has `preloadDefaultTankScene()`, call it before `setRouteTransition()`.
- If the project has a newer generic preload function, call that instead, but keep it non-blocking.
- Do not `await` model preloading before starting the zoom, because that makes the click feel laggy.
- Keep `id` or another stable token so repeated clicks do not create overlapping timers.

### Timed Route Handoff

Navigation happens after the zoom duration. This is the current implementation and the simplest portable version.

`src/App.jsx`

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

Porting rule:

- Keep the cleanup. Without it, fast navigation/unmounts can leave stale timers.
- Keep the dependency on a transition token/path.
- Do not navigate immediately inside `handleSimulateClick()`.

Optional robustness upgrade:

- A future version may add an `onTransitionComplete` callback from the globe and keep this timer as a fallback.
- If doing that, preserve the same visible timings: zoom still starts immediately and mission navigation still occurs around `900ms`.

## Main Transition Component / Wrapper

The app uses two fullscreen layers. The landing layer remains mounted; the mission layer only mounts when the route is not `/`.

`src/App.jsx`

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

`src/styles.css`

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

Porting rule:

- Keep both route layers fullscreen.
- Keep `overflow: hidden` on the shell.
- Keep the mission layer above the landing layer (`z-index: 2` vs `1`).
- Do not add `display: none` to the landing layer; the globe should remain mounted for smooth return and state retention.
- It is acceptable for the mission route to unmount when returning home.

## Animation Details

### Landing Page Passes Target Into Globe

The visible transition is not a CSS page transition. It is the globe camera moving closer to the selected point.

`src/App.jsx`

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

Porting rule:

- `transitionTarget` should be `null`/`undefined` except during navigation.
- `transitionDuration` must be `900` unless the timing constants are intentionally changed.

### Globe Close Zoom

The close zoom uses a tiny altitude. This is what creates the strong "dive into the mission area" feeling.

`src/components/LandingGlobe.jsx`

```jsx
const CLOSE_TRANSITION_ALTITUDE = 0.003;
```

`src/components/LandingGlobe.jsx`

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
}, [transitionDuration, transitionTarget, tuneGlobeQuality]);
```

Porting rule:

- Disable `autoRotate`, `controls.enabled`, and `enableDamping` during the transition.
- Restore the original control values in cleanup.
- Do not keep damping on during the close zoom; it can make the zoom feel laggy or inconsistent.
- Do not change `CLOSE_TRANSITION_ALTITUDE` unless the zoom is visibly clipping.

### Marker Focus Movement

Marker/chip selection uses a different camera movement from the route transition. Keep this separate.

`src/components/LandingGlobe.jsx`

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

Porting rule:

- Keep selection focus at altitude `1.55`.
- Keep selection focus duration `420ms`.
- Keep `requestAnimationFrame()` so the camera command runs after React has committed the marker state.
- Do not run this effect while `transitionTarget` exists.

### Hide Globe UI During Close Zoom

The transition hides rings and HTML beacons to avoid UI clutter during the close zoom.

`src/components/LandingGlobe.jsx`

```jsx
const isTransitioning = Boolean(transitionTarget);
const ringsData = isTransitioning ? [] : markers.filter((m) => m.selected);
const htmlElementsData = isTransitioning ? [] : markers;
```

Porting rule:

- During route transition, remove globe overlays from the globe data props.
- Do not merely hide them with opacity if they still intercept pointer events.

### CSS Transitions That Affect Feel

These are not the page transition, but they contribute to the perceived smoothness of the home screen.

`src/styles.css`

```css
.lf-picker__chip {
  display: flex;
  align-items: center;
  gap: 10px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 10px 18px;
  color: var(--text);
  font-size: 13px;
  letter-spacing: 0.06em;
  transition: all 160ms ease;
}
```

`src/styles.css`

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
```

`src/styles.css`

```css
.lf-globe {
  position: absolute;
  inset: 0;
  z-index: 1;
  transform-origin: center center;
  transition: opacity 200ms ease, filter 200ms ease, transform 200ms ease;
  will-change: opacity, filter, transform;
}
```

Porting rule:

- Keep UI transitions under roughly `200ms`.
- Prefer `transform`, `opacity`, and `filter`.
- Avoid animating layout properties during route handoff.

## Route-Specific Behavior

### Home Route `/`

The home route owns marker selection and transition startup. It adds `is-transitioning` while transition state exists.

`src/App.jsx`

```jsx
return (
  <div className={`lf-landing-full${routeTransition ? " is-transitioning" : ""}`}>
    <Stars />
    <LandingGlobe
      markers={markers}
      focusLatLng={focusLatLng}
      transitionTarget={routeTransition?.target}
      transitionDuration={TRANSITION_ZOOM_MS}
      onSelectMarker={handleSelectMarker}
      onGlobeClick={handleGlobeClick}
    />
```

Porting rule:

- Keep the landing page full bleed.
- Keep `Stars` behind the globe if present.
- Keep `is-transitioning` available for future styling, but do not rely on it for the current zoom.

### Preset Mission Routes

Preset theater routes use `/mission/:theaterId`.

`src/App.jsx`

```jsx
<Route path="/mission/:theaterId" element={<TheaterWorkbench />} />
```

### Custom Mission Route

Custom coordinates use the same route pattern with query parameters.

`src/components/TheaterWorkbench.jsx`

```jsx
const theater = useMemo(() => {
  if (theaterId === "custom") {
    const lat = Number.parseFloat(searchParams.get("lat") ?? "");
    const lng = Number.parseFloat(searchParams.get("lng") ?? "");
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return buildCustomTheater(lat, lng);
    }
  }
  return theaters[theaterId] ?? null;
}, [theaterId, searchParams]);
```

Porting rule:

- Preserve `/mission/custom?lat=...&lng=...`.
- Do not create a separate route unless the rest of the app has already moved custom coordinates elsewhere.

### Mission Back Navigation

Mission pages return to home immediately.

`src/components/TheaterWorkbench.jsx`

```jsx
<button
  type="button"
  className="brand brand--button"
  onClick={() => navigate("/")}
  title="Back to globe"
>
```

Porting rule:

- Current behavior has no reverse transition.
- If adding reverse transition later, do not replace landing-to-mission behavior. Add a separate reverse state.

## How to Modify or Add a Transition

### Codex 5.5 Implementation Checklist

When applying this transition system to a past or future branch, do this in order:

1. Find the root route component that owns `Routes`, `useNavigate()`, and `useLocation()`.
2. Add or preserve `routeTransition` state in that component.
3. Add `TRANSITION_ZOOM_MS = 900`, `POST_ZOOM_HOLD_MS = 0`, and `TRANSITION_NAV_MS`.
4. Ensure the landing page `Simulate` handler calls `onBeginRouteTransition({ path, target })`.
5. Ensure `onBeginRouteTransition()` preloads the mission scene/model synchronously but does not await preload.
6. Pass `transitionTarget` and `transitionDuration` into the globe component.
7. In the globe component, call `pointOfView({ lat, lng, altitude: 0.003 }, 900)` when `transitionTarget` exists.
8. Disable globe controls during the close zoom and restore them in cleanup.
9. Hide globe rings/beacons while transition is active.
10. Navigate after `TRANSITION_NAV_MS`, then reset `routeTransition`.
11. Keep route layers fullscreen and stacked with mission above landing.
12. Build and manually verify by clicking several preset theaters plus a custom coordinate.

### Minimal Reference Patch Shape

Use this shape when a branch is missing the transition state:

```jsx
const TRANSITION_ZOOM_MS = 900;
const POST_ZOOM_HOLD_MS = 0;
const TRANSITION_NAV_MS = TRANSITION_ZOOM_MS + POST_ZOOM_HOLD_MS;

const [routeTransition, setRouteTransition] = useState(null);

const beginRouteTransition = useCallback((next) => {
  preloadDefaultTankScene?.();
  setRouteTransition((current) => {
    if (current) return current;
    return {
      id: Date.now(),
      path: next.path,
      target: next.target,
    };
  });
}, []);

useEffect(() => {
  if (!routeTransition) return undefined;

  const navigateTimer = window.setTimeout(() => {
    navigate(routeTransition.path);
    setRouteTransition(null);
  }, TRANSITION_NAV_MS);

  return () => window.clearTimeout(navigateTimer);
}, [navigate, routeTransition?.id, routeTransition?.path]);
```

Use this shape when a branch has a globe component but no transition zoom:

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
      altitude: 0.003,
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

### Smoothness Rules

Follow these strictly:

- Do not block the click handler with async loading.
- Do not rebuild the WebGL scene during the transition.
- Do not unmount the landing globe before the timer fires.
- Do not animate width, height, top, left, right, bottom, margin, or padding during the page handoff.
- Do not add blur overlays to the route switch.
- Do not shorten the zoom below `900ms`; it feels abrupt.
- Do not add a post-zoom hold unless explicitly requested.
- Disable duplicate clicks during transition.

## Gotchas

- The current implementation is timer-driven. The route changes after `TRANSITION_NAV_MS`, not after a callback from `react-globe.gl`.
- `react-globe.gl` controls the easing inside `pointOfView()`. The app controls duration only.
- The `is-transitioning` class exists on the landing root, but current CSS does not use it. The visible transition comes from the globe camera.
- The landing page stays mounted behind route layers. This is intentional.
- The mission page is conditionally mounted only when the app is not on `/`.
- The mission route layer has `z-index: 2`; the landing layer has `z-index: 1`.
- `preloadDefaultTankScene()` is part of the transition feel. Removing it can make the route switch feel stuttery even if the globe zoom is smooth.
- `transitionTarget` must suppress normal focus movement. Otherwise the 420ms marker focus and 900ms route zoom can fight each other.
- If a future branch uses React Strict Mode, effects may run twice in development. Keep duplicate guards and timer cleanup.
- If route components move into layout files, preserve the same data flow: click starts state, state drives globe, timer drives navigate.

## Verification

After implementing or porting:

1. Run `npm run build`.
2. Open the app and click a preset theater.
3. Confirm the globe zoom starts immediately.
4. Confirm the mission route appears after roughly `900ms`.
5. Confirm there is no blur/fade overlay.
6. Return to home and test another theater.
7. Add a custom coordinate and test it.
8. Click `Simulate` repeatedly during zoom; it should not create multiple navigations.

Expected result: the transition should feel like one continuous globe dive followed by an immediate route reveal.
