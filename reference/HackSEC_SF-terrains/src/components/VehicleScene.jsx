import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// Side-effect imports — each script attaches a factory to globalThis.
import "../assets/cad/teledyne_flir_centaur_land/centaur_land_threejs.js";
import "../assets/cad/rq11b_raven_air/rq11b_raven_threejs.js";

const VEHICLE_FACTORIES = {
  ugv: { globalKey: "CentaurLandThreeJS", factoryKey: "createCentaurLandSurrogate" },
  drone: { globalKey: "RavenAirThreeJS", factoryKey: "createRavenAirSurrogate" },
};

function getFactory(vehicleId) {
  const cfg = VEHICLE_FACTORIES[vehicleId];
  if (!cfg) return null;
  const ns = globalThis[cfg.globalKey];
  return ns && typeof ns[cfg.factoryKey] === "function" ? ns[cfg.factoryKey] : null;
}

export function VehicleScene({ vehicleId }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 200);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // Lighting: cool key from above, warm rim from behind, ambient sky
    const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x0a1226, 0.7);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(4, 6, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffb37a, 0.55);
    rim.position.set(-3, 3, -4);
    scene.add(rim);

    // Stage: glowing pad + soft ground disk
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(8, 96),
      new THREE.MeshStandardMaterial({
        color: 0x0a1226,
        metalness: 0.0,
        roughness: 0.95,
        transparent: true,
        opacity: 0.55,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const padTexture = (() => {
      // Procedural radial gradient texture for a glowing pad under the vehicle
      const c = document.createElement("canvas");
      c.width = c.height = 256;
      const ctx = c.getContext("2d");
      const grad = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
      grad.addColorStop(0, "rgba(125,211,252,0.55)");
      grad.addColorStop(0.55, "rgba(125,211,252,0.10)");
      grad.addColorStop(1, "rgba(125,211,252,0.0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    })();
    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(2.6, 64),
      new THREE.MeshBasicMaterial({ map: padTexture, transparent: true, depthWrite: false }),
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.001;
    scene.add(pad);

    // Mount the vehicle surrogate (Z-up source → rotated to Y-up here)
    const assetWrapper = new THREE.Group();
    scene.add(assetWrapper);

    const factory = getFactory(vehicleId);
    let asset = null;
    if (factory) {
      asset = factory(THREE, {
        showInternal: false,
        showCollision: false,
        ghostExterior: false,
        showLabels: false,
      });
      const inner = new THREE.Group();
      inner.add(asset.group);
      inner.rotation.x = -Math.PI / 2;
      assetWrapper.add(inner);
    } else {
      const fallback = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.4, 1.0),
        new THREE.MeshStandardMaterial({ color: 0x6ee7b7 }),
      );
      fallback.position.y = 0.2;
      assetWrapper.add(fallback);
    }

    // Center horizontally and sit on the ground
    const box = new THREE.Box3().setFromObject(assetWrapper);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    assetWrapper.position.x -= center.x;
    assetWrapper.position.z -= center.z;
    assetWrapper.position.y -= box.min.y;

    // Hover the drone above the pad for visual clarity
    if (vehicleId === "drone") {
      assetWrapper.position.y += 0.6;
    }

    // Frame camera against actual asset size
    const radius = Math.max(size.x, size.y, size.z) * 0.5;
    const dist = Math.max(2.4, radius * 3.6);
    const verticalAim = vehicleId === "drone" ? size.y * 0.6 + 0.6 : size.y * 0.45;
    camera.position.set(dist * 0.85, dist * 0.55, dist);
    camera.lookAt(0, verticalAim, 0);

    // Orbit controls — drag to rotate, scroll to zoom, right-drag to pan
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, verticalAim, 0);
    controls.minDistance = Math.max(0.6, radius * 1.2);
    controls.maxDistance = Math.max(8, radius * 12);
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.6;
    let userInteracting = false;
    controls.addEventListener("start", () => { userInteracting = true; controls.autoRotate = false; });
    controls.addEventListener("end", () => { userInteracting = false; });

    let resizeRaf = 0;
    function resize() {
      const { clientWidth, clientHeight } = mount;
      if (clientWidth === 0 || clientHeight === 0) return;
      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(resize);
    });
    ro.observe(mount);
    resize();

    let raf = 0;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (vehicleId === "drone") {
        assetWrapper.position.y =
          (size.y * 0.5 + 0.6) + Math.sin(now / 1400) * 0.05;
      }
      if (asset && typeof asset.update === "function") {
        asset.update(dt);
      }
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(resizeRaf);
      ro.disconnect();
      controls.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      padTexture.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose?.();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) m.dispose?.();
        }
      });
    };
  }, [vehicleId]);

  return <div ref={mountRef} className="lf-vehicle-scene" />;
}
