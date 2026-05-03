import { useEffect, useRef, useState } from "react";
import Globe from "react-globe.gl";

export function LandingGlobe({ markers, focusLatLng, onSelectMarker, onGlobeClick }) {
  const containerRef = useRef(null);
  const globeRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

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
    if (!globeRef.current || !focusLatLng) return;
    globeRef.current.pointOfView(
      { lat: focusLatLng.lat, lng: focusLatLng.lng, altitude: 1.55 },
      900,
    );
  }, [focusLatLng]);

  const ringsData = markers.filter((m) => m.selected);

  return (
    <div ref={containerRef} className="lf-globe">
      {size.w > 0 && (
        <Globe
          ref={globeRef}
          width={size.w}
          height={size.h}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          atmosphereColor="#7dd3fc"
          atmosphereAltitude={0.18}
          ringsData={ringsData}
          ringLat="lat"
          ringLng="lng"
          ringColor={(p) => [p.accent, `${p.accent}00`]}
          ringMaxRadius={5.4}
          ringPropagationSpeed={1.4}
          ringRepeatPeriod={1400}
          htmlElementsData={markers}
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
          onGlobeClick={({ lat, lng }) => onGlobeClick(lat, lng)}
        />
      )}
    </div>
  );
}
