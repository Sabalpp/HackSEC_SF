import { useCallback, useEffect, useRef, useState } from "react";
import Globe from "react-globe.gl";
import * as THREE from "three";

const CLOSE_TRANSITION_ALTITUDE = 0.003;
const MAX_BASE_PIXEL_RATIO = 2;
const EARTH_TEXTURE_URL = "https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/january/world.200401.3x21600x10800.jpg";
const EARTH_BUMP_URL = "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png";

export function LandingGlobe({
  markers,
  focusLatLng,
  transitionTarget,
  transitionDuration = 1500,
  onSelectMarker,
  onGlobeClick,
}) {
  const containerRef = useRef(null);
  const globeRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

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

  useEffect(() => {
    function resize() {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      setSize({ w: clientWidth, h: clientHeight });
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    if (!globeRef.current) return;
    const controls = globeRef.current.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.22;
    controls.enablePan = false;
  }, [size.w]);

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

  const isTransitioning = Boolean(transitionTarget);
  const ringsData = isTransitioning ? [] : markers.filter((m) => m.selected);
  const htmlElementsData = isTransitioning ? [] : markers;

  return (
    <div ref={containerRef} className="lf-globe">
      {size.w > 0 && (
        <Globe
          ref={globeRef}
          width={size.w}
          height={size.h}
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
          ringsData={ringsData}
          ringLat="lat"
          ringLng="lng"
          ringColor={(p) => [p.accent, `${p.accent}00`]}
          ringMaxRadius={5.4}
          ringPropagationSpeed={1.4}
          ringRepeatPeriod={1400}
          htmlElementsData={htmlElementsData}
          htmlLat="lat"
          htmlLng="lng"
          htmlElement={(point) => {
            const el = document.createElement("button");
            el.type = "button";
            el.className = `lf-beacon${point.selected ? " is-selected" : ""}${point.kind === "custom" ? " is-custom" : ""}`;
            el.style.setProperty("--lf-beacon-color", point.accent);
            el.innerHTML = `
              <span class="lf-beacon__halo"></span>
              <span class="lf-beacon__ring">
                <span class="lf-beacon__sweep"></span>
                <span class="lf-beacon__axis lf-beacon__axis--a"></span>
                <span class="lf-beacon__axis lf-beacon__axis--b"></span>
                <span class="lf-beacon__core"></span>
              </span>
              <span class="lf-beacon__label">${point.label}</span>
            `;
            el.onclick = (event) => {
              event.stopPropagation();
              onSelectMarker(point.id);
            };
            return el;
          }}
          onGlobeClick={({ lat, lng }) => {
            if (!transitionTarget) onGlobeClick(lat, lng);
          }}
        />
      )}
    </div>
  );
}
