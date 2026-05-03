import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  addThompsonPassSnowTopoWorld,
  renderHeightMetersAt,
  terrainNormalAt,
} from "../terrains/thompson_pass_snow_topo_terrain";

import "../assets/cad/teledyne_flir_centaur_land/centaur_land_threejs.js";
import "../assets/cad/rq11b_raven_air/rq11b_raven_threejs.js";

const VEHICLE_FACTORIES = {
  ugv: { globalKey: "CentaurLandThreeJS", factoryKey: "createCentaurLandSurrogate" },
  drone: { globalKey: "RavenAirThreeJS", factoryKey: "createRavenAirSurrogate" },
};

const DEPLOYMENT_POINT = { x: 0, z: 0 };
const VEHICLE_ALTITUDE = { ugv: 0.08, drone: 8 };

function getFactory(vehicleId) {
  const cfg = VEHICLE_FACTORIES[vehicleId];
  if (!cfg) return null;
  const ns = globalThis[cfg.globalKey];
  return ns && typeof ns[cfg.factoryKey] === "function" ? ns[cfg.factoryKey] : null;
}

function createVehicleModel(vehicleId) {
  const mount = new THREE.Group();
  const model = new THREE.Group();
  mount.add(model);

  const factory = getFactory(vehicleId);
  let asset = null;

  if (factory) {
    asset = factory(THREE, {
      showInternal: false,
      showCollision: false,
      ghostExterior: false,
      showLabels: false,
    });
    const cadAxisAdapter = new THREE.Group();
    cadAxisAdapter.add(asset.group);
    cadAxisAdapter.rotation.x = -Math.PI / 2;
    model.add(cadAxisAdapter);
  } else {
    const fallback = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.55, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x6ee7b7 }),
    );
    fallback.position.y = 0.275;
    model.add(fallback);
  }

  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  model.position.set(-center.x, -box.min.y, -center.z);

  return { mount, asset, size };
}

function createDeploymentPad(normal, height, vehicleId) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(128, 128, 5, 128, 128, 128);
  grad.addColorStop(0, "rgba(125,211,252,0.42)");
  grad.addColorStop(0.55, "rgba(125,211,252,0.12)");
  grad.addColorStop(1, "rgba(125,211,252,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const radius = vehicleId === "drone" ? 5.2 : 3.8;
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 64),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  pad.position.set(DEPLOYMENT_POINT.x, height + 0.04, DEPLOYMENT_POINT.z);
  pad.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

  return { pad, texture };
}

export function ThompsonPassVehicleScene({ vehicleId }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return;

    const scene = new THREE.Scene();
    addThompsonPassSnowTopoWorld(scene);

    const terrainHeight = renderHeightMetersAt(DEPLOYMENT_POINT.x, DEPLOYMENT_POINT.z);
    const terrainNormal = terrainNormalAt(DEPLOYMENT_POINT.x, DEPLOYMENT_POINT.z);
    const deployTarget = new THREE.Vector3(
      DEPLOYMENT_POINT.x,
      terrainHeight + (VEHICLE_ALTITUDE[vehicleId] ?? 0.08),
      DEPLOYMENT_POINT.z,
    );

    const { pad, texture } = createDeploymentPad(terrainNormal, terrainHeight, vehicleId);
    scene.add(pad);

    const { mount: vehicleMount, asset, size } = createVehicleModel(vehicleId);
    vehicleMount.position.copy(deployTarget);
    if (vehicleId !== "drone") {
      vehicleMount.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), terrainNormal);
    }
    scene.add(vehicleMount);

    const fill = new THREE.DirectionalLight(0xbfe7ff, 1.1);
    fill.position.set(120, 240, -180);
    scene.add(fill);

    const camera = new THREE.PerspectiveCamera(48, 1, 1, 2400);
    const vehicleRadius = Math.max(size.x, size.y, size.z) * 0.5;
    const frameDistance = Math.max(9, vehicleRadius * 4.8);
    const targetY = terrainHeight + (vehicleId === "drone" ? 8 : Math.max(1.1, size.y * 0.45));
    camera.position.set(frameDistance * 0.95, targetY + frameDistance * 0.42, frameDistance * 1.25);
    camera.lookAt(0, targetY, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountEl.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, targetY, 0);
    controls.enableDamping = true;
    controls.minDistance = Math.max(2.4, vehicleRadius * 1.4);
    controls.maxDistance = 980;
    controls.maxPolarAngle = THREE.MathUtils.degToRad(88);
    controls.update();

    let resizeRaf = 0;
    function resize() {
      const { clientWidth, clientHeight } = mountEl;
      if (clientWidth === 0 || clientHeight === 0) return;
      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / Math.max(clientHeight, 1);
      camera.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(resize);
    });
    ro.observe(mountEl);
    resize();

    let raf = 0;
    let last = performance.now();
    function tick(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (vehicleId === "drone") {
        vehicleMount.position.y = terrainHeight + VEHICLE_ALTITUDE.drone + Math.sin(now / 1300) * 0.25;
      }
      if (asset && typeof asset.update === "function") {
        asset.update(dt);
      }
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(resizeRaf);
      ro.disconnect();
      controls.dispose();
      texture.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mountEl) {
        mountEl.removeChild(renderer.domElement);
      }
      scene.traverse((obj) => {
        obj.geometry?.dispose?.();
      });
    };
  }, [vehicleId]);

  return <div ref={mountRef} className="thompson-pass-scene" />;
}
