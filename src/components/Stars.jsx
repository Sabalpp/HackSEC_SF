import { useEffect, useRef } from "react";

export function Stars({ density = 0.0005, twinkle = true }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let stars = [];

    function seed() {
      const w = canvas.width;
      const h = canvas.height;
      const count = Math.round(w * h * density);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.4 + 0.2,
        baseAlpha: Math.random() * 0.6 + 0.3,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.6 + 0.2,
      }));
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const { clientWidth, clientHeight } = canvas;
      canvas.width = clientWidth * dpr;
      canvas.height = clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function draw(t) {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      const time = t / 1000;
      for (const s of stars) {
        const alpha = twinkle
          ? s.baseAlpha * (0.6 + 0.4 * Math.sin(s.phase + time * s.speed))
          : s.baseAlpha;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(238, 245, 255, ${alpha.toFixed(3)})`;
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [density, twinkle]);

  return <canvas ref={canvasRef} className="lf-stars-canvas" aria-hidden="true" />;
}
