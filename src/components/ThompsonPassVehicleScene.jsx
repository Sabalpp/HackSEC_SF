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
const DEFAULT_TANK_ID = "ugv";
const ENTRY_ZOOM_MS = 850;
const ENTRY_ZOOM_DISTANCE = 2.15;

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

let thompsonWorldTemplate = null;
let defaultTankModelTemplate = null;
let defaultTankSceneBundle = null;
let defaultTankPreloadPromise = null;

function getFactory(vehicleId) {
  const cfg = VEHICLE_FACTORIES[vehicleId];
  if (!cfg) return null;
  const ns = globalThis[cfg.globalKey];
  return ns && typeof ns[cfg.factoryKey] === "function" ? ns[cfg.factoryKey] : null;
}

function buildVehicleModel(vehicleId) {
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

  return { mount, asset, size, usesSharedResources: false };
}

function getOrCreateDefaultTankModelTemplate() {
  if (!defaultTankModelTemplate) {
    defaultTankModelTemplate = buildVehicleModel(DEFAULT_TANK_ID);
  }
  return defaultTankModelTemplate;
}

function createVehicleModel(vehicleId) {
  if (vehicleId === DEFAULT_TANK_ID) {
    const template = getOrCreateDefaultTankModelTemplate();
    return {
      mount: template.mount.clone(true),
      asset: null,
      size: template.size.clone(),
      usesSharedResources: true,
    };
  }

  return buildVehicleModel(vehicleId);
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

function getOrCreateThompsonWorldTemplate() {
  if (!thompsonWorldTemplate) {
    thompsonWorldTemplate = new THREE.Scene();
    addThompsonPassSnowTopoWorld(thompsonWorldTemplate);
  }
  return thompsonWorldTemplate;
}

function addCachedThompsonWorld(scene) {
  const template = getOrCreateThompsonWorldTemplate();
  scene.name = template.name;
  scene.background = template.background?.clone?.() ?? template.background ?? null;
  scene.fog = template.fog?.clone?.() ?? template.fog ?? null;

  const world = new THREE.Group();
  world.name = "cached_thompson_pass_world_instance";
  template.children.forEach((child) => {
    world.add(child.clone(true));
  });
  scene.add(world);
  return world;
}

function disposeObjectTree(root, { disposeMaterials = true } = {}) {
  root.traverse((obj) => {
    obj.geometry?.dispose?.();
    if (!disposeMaterials || !obj.material) return;
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    materials.forEach((material) => {
      material.map?.dispose?.();
      material.normalMap?.dispose?.();
      material.roughnessMap?.dispose?.();
      material.metalnessMap?.dispose?.();
      material.dispose?.();
    });
  });
}

function createThompsonVehicleSceneBundle(vehicleId) {
  const scene = new THREE.Scene();
  addCachedThompsonWorld(scene);

  const terrainHeight = renderHeightMetersAt(DEPLOYMENT_POINT.x, DEPLOYMENT_POINT.z);
  const terrainNormal = terrainNormalAt(DEPLOYMENT_POINT.x, DEPLOYMENT_POINT.z);
  const deployTarget = new THREE.Vector3(
    DEPLOYMENT_POINT.x,
    terrainHeight + (VEHICLE_ALTITUDE[vehicleId] ?? VEHICLE_ALTITUDE[DEFAULT_TANK_ID]),
    DEPLOYMENT_POINT.z,
  );

  const { pad, texture } = createDeploymentPad(terrainNormal, terrainHeight, vehicleId);
  scene.add(pad);

  const {
    mount: vehicleMount,
    asset,
    size,
    usesSharedResources,
  } = createVehicleModel(vehicleId);
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
  const targetPosition = new THREE.Vector3(0, targetY, 0);
  const homeCameraPosition = camera.position.clone();

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  return {
    scene,
    camera,
    renderer,
    terrainHeight,
    texture,
    pad,
    vehicleMount,
    asset,
    usesSharedResources,
    vehicleRadius,
    targetY,
    targetPosition,
    homeCameraPosition,
    vehicleId,
    inUse: false,
  };
}

function getOrCreateDefaultTankSceneBundle() {
  if (!defaultTankSceneBundle) {
    defaultTankSceneBundle = createThompsonVehicleSceneBundle(DEFAULT_TANK_ID);
  }
  return defaultTankSceneBundle;
}

function takeDefaultTankSceneBundle() {
  const bundle = defaultTankSceneBundle;
  if (!bundle || bundle.inUse) return null;
  bundle.inUse = true;
  return bundle;
}

function releaseDefaultTankSceneBundle(bundle) {
  if (bundle === defaultTankSceneBundle) {
    bundle.inUse = false;
  }
}

export function preloadDefaultTankScene() {
  if (typeof window === "undefined") return Promise.resolve();
  if (defaultTankPreloadPromise) return defaultTankPreloadPromise;

  defaultTankPreloadPromise = new Promise((resolve) => {
    const warm = () => {
      try {
        const bundle = getOrCreateDefaultTankSceneBundle();
        bundle.renderer.setPixelRatio(1);
        bundle.renderer.setSize(96, 96, false);
        bundle.renderer.render(bundle.scene, bundle.camera);
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

export function ThompsonPassVehicleScene({ vehicleId }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return;

    const prewarmedBundle = vehicleId === DEFAULT_TANK_ID ? takeDefaultTankSceneBundle() : null;
    const {
      scene,
      camera,
      renderer,
      terrainHeight,
      texture,
      pad,
      vehicleMount,
      asset,
      usesSharedResources,
      vehicleRadius,
      targetY,
      targetPosition,
      homeCameraPosition,
    } = prewarmedBundle ?? createThompsonVehicleSceneBundle(vehicleId);
    const finalCameraPosition = homeCameraPosition.clone();
    const entryCameraPosition = targetPosition
      .clone()
      .add(finalCameraPosition.clone().sub(targetPosition).multiplyScalar(ENTRY_ZOOM_DISTANCE));
    camera.position.copy(entryCameraPosition);
    camera.lookAt(targetPosition);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    mountEl.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(targetPosition);
    controls.enableDamping = true;
    controls.minDistance = Math.max(2.4, vehicleRadius * 1.4);
    controls.maxDistance = 980;
    controls.maxPolarAngle = THREE.MathUtils.degToRad(88);
    controls.update();
    const entryStartedAt = performance.now();

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
      const entryProgress = Math.min(1, (now - entryStartedAt) / ENTRY_ZOOM_MS);
      if (entryProgress < 1) {
        camera.position.lerpVectors(
          entryCameraPosition,
          finalCameraPosition,
          easeOutCubic(entryProgress),
        );
        camera.lookAt(targetPosition);
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
      if (renderer.domElement.parentNode === mountEl) {
        mountEl.removeChild(renderer.domElement);
      }
      if (prewarmedBundle) {
        releaseDefaultTankSceneBundle(prewarmedBundle);
        return;
      }
      texture.dispose();
      renderer.dispose();
      pad.geometry.dispose();
      pad.material.dispose();
      if (!usesSharedResources) {
        disposeObjectTree(vehicleMount);
      }
    };
  }, [vehicleId]);

  return <div ref={mountRef} className="thompson-pass-scene" />;
}
