import { useEffect, useRef, useState } from "react";
import Globe from "react-globe.gl";
import { useNavigate } from "react-router-dom";
import { theaterList } from "../data/theaters";

export function LandingGlobe() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const globeRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState(null);

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
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.4;
    }
  }, []);

  const points = theaterList.map((t) => ({
    ...t,
    size: hover === t.id ? 1.2 : 0.8,
    color: t.accent,
  }));

  return (
    <div ref={containerRef} className="landing__globe">
      {size.w > 0 && (
        <Globe
          ref={globeRef}
          width={size.w}
          height={size.h}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          atmosphereColor="#7dd3fc"
          atmosphereAltitude={0.18}
          pointsData={points}
          pointLat="lat"
          pointLng="lng"
          pointAltitude={0.02}
          pointRadius="size"
          pointColor="color"
          pointLabel={(d) => `<div style="padding:6px 10px;background:#0c1220;border:1px solid #1b2742;border-radius:6px;color:#e6edff;font:13px system-ui">${d.label}</div>`}
          onPointHover={(p) => setHover(p ? p.id : null)}
          onPointClick={(p) => navigate(`/mission/${p.id}`)}
        />
      )}
    </div>
  );
}
