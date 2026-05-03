import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import "../assets/cad/teledyne_flir_centaur_land/centaur_land_threejs.js";
import "../assets/cad/rq11b_raven_air/rq11b_raven_threejs.js";

const VEHICLE_FACTORIES = {
  ugv: { globalKey: "CentaurLandThreeJS", factoryKey: "createCentaurLandSurrogate" },
  drone: { globalKey: "RavenAirThreeJS", factoryKey: "createRavenAirSurrogate" },
};

const DEFAULT_DEPLOYMENT_POINT = Object.freeze({ x: 0, z: 0 });
const VEHICLE_ALTITUDE = Object.freeze({ ugv: 0.08, drone: 8 });
const VEHICLE_SPEED = Object.freeze({ ugv: 1.6, drone: 5.5 });
const DEFAULT_ROUTE_OFFSETS = Object.freeze([
  Object.freeze({ x: -12, z: -8 }),
  Object.freeze({ x: 8, z: -12 }),
  Object.freeze({ x: 18, z: 4 }),
  Object.freeze({ x: 2, z: 16 }),
  Object.freeze({ x: -16, z: 8 }),
]);
const EFFECT_COLORS = Object.freeze({
  dust: 0xc7aa75,
  mist: 0xdde8dc,
  snow: 0xf5fbff,
});
const EFFECT_PARTICLE_COUNT = 72;

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

function createDeploymentPad(normal, height, deploymentPoint, vehicleId) {
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
  pad.position.set(deploymentPoint.x, height + 0.04, deploymentPoint.z);
  pad.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

  return { pad, texture };
}

function createRoute(deploymentPoint, routeOffsets) {
  const points = routeOffsets.map((point) => new THREE.Vector2(
    deploymentPoint.x + point.x,
    deploymentPoint.z + point.z,
  ));
  const start = points[0] ?? new THREE.Vector2(deploymentPoint.x, deploymentPoint.z);
  const next = points.find((point) => point.distanceToSquared(start) > 0.000001)
    ?? start.clone().add(new THREE.Vector2(1, 0));
  const tangent = next.clone().sub(start).normalize();

  return { start, tangent };
}

function sampleRoute(route, distanceMeters) {
  const x = route.start.x + route.tangent.x * distanceMeters;
  const z = route.start.y + route.tangent.y * distanceMeters;

  return { x, z, tangent: route.tangent };
}

function setForwardUpQuaternion(object, forward, up) {
  const xAxis = forward.lengthSq() > 0.000001
    ? forward.clone().normalize()
    : new THREE.Vector3(0, 0, 1);
  const yAxis = up.lengthSq() > 0.000001
    ? up.clone().normalize()
    : new THREE.Vector3(0, 1, 0);

  // The vehicle CAD assets use local +X as front and local +Y as up after axis adaptation.
  xAxis.projectOnPlane(yAxis).normalize();
  const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();
  const correctedUp = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();
  const matrix = new THREE.Matrix4().makeBasis(xAxis, correctedUp, zAxis);
  object.quaternion.setFromRotationMatrix(matrix);
}

function createContactEffect(effectType) {
  const positions = new Float32Array(EFFECT_PARTICLE_COUNT * 3);
  const alphas = new Float32Array(EFFECT_PARTICLE_COUNT);
  const scales = new Float32Array(EFFECT_PARTICLE_COUNT);
  const particles = Array.from({ length: EFFECT_PARTICLE_COUNT }, () => ({
    age: 99,
    life: 1,
    velocity: new THREE.Vector3(),
  }));

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("alpha", new THREE.BufferAttribute(alphas, 1));
  geometry.setAttribute("sizeScale", new THREE.BufferAttribute(scales, 1));

  const material = new THREE.PointsMaterial({
    color: EFFECT_COLORS[effectType] ?? EFFECT_COLORS.dust,
    size: effectType === "snow" ? 0.24 : 0.32,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  let cursor = 0;

  function emit(origin, forward, groundHeight, intensity = 1) {
    const count = Math.max(1, Math.floor(intensity * (effectType === "snow" ? 3 : 5)));
    const back = forward.clone().normalize().multiplyScalar(-1);
    const side = new THREE.Vector3(-back.z, 0, back.x).normalize();

    for (let i = 0; i < count; i += 1) {
      const particle = particles[cursor];
      cursor = (cursor + 1) % particles.length;

      const lateral = (Math.random() - 0.5) * (effectType === "snow" ? 1.2 : 1.8);
      const trail = Math.random() * (effectType === "snow" ? 0.65 : 1.1);
      particle.age = 0;
      particle.life = effectType === "snow" ? 1.0 + Math.random() * 0.45 : 0.75 + Math.random() * 0.45;
      particle.origin = origin.clone()
        .addScaledVector(back, trail)
        .addScaledVector(side, lateral);
      particle.origin.y = groundHeight + 0.08 + Math.random() * 0.18;
      particle.velocity.copy(back)
        .multiplyScalar(effectType === "snow" ? 0.35 + Math.random() * 0.35 : 0.75 + Math.random() * 0.8)
        .addScaledVector(side, (Math.random() - 0.5) * 0.4);
      particle.velocity.y = effectType === "snow" ? 0.18 + Math.random() * 0.35 : 0.28 + Math.random() * 0.5;
      particle.scale = effectType === "snow" ? 0.55 + Math.random() * 0.55 : 0.75 + Math.random() * 0.95;
    }
  }

  function update(dt) {
    for (let i = 0; i < particles.length; i += 1) {
      const particle = particles[i];
      const base = i * 3;

      if (!particle.origin || particle.age >= particle.life) {
        positions[base] = 0;
        positions[base + 1] = -9999;
        positions[base + 2] = 0;
        alphas[i] = 0;
        scales[i] = 0;
        continue;
      }

      particle.age += dt;
      particle.velocity.y += (effectType === "snow" ? 0.08 : 0.18) * dt;
      particle.velocity.multiplyScalar(1 - dt * 0.7);
      particle.origin.addScaledVector(particle.velocity, dt);

      const t = Math.min(1, particle.age / particle.life);
      positions[base] = particle.origin.x;
      positions[base + 1] = particle.origin.y;
      positions[base + 2] = particle.origin.z;
      alphas[i] = (1 - t) * 0.75;
      scales[i] = particle.scale * (1 + t * 1.6);
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.alpha.needsUpdate = true;
    geometry.attributes.sizeScale.needsUpdate = true;
    material.opacity = effectType === "snow" ? 0.42 : 0.48;
  }

  return {
    points,
    emit,
    update,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

export function MappedTerrainVehicleScene({
  vehicleId,
  runToken = 0,
  simulationActive = false,
  effectType = "dust",
  addWorld,
  renderHeightMetersAt,
  terrainNormalAt,
  className = "mapped-terrain-scene",
  deploymentPoint = DEFAULT_DEPLOYMENT_POINT,
  routeOffsets = DEFAULT_ROUTE_OFFSETS,
}) {
  const mountRef = useRef(null);
  const simulationActiveRef = useRef(simulationActive);

  useEffect(() => {
    simulationActiveRef.current = simulationActive;
  }, [simulationActive]);

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return;

    const scene = new THREE.Scene();
    addWorld(scene);

    const route = createRoute(deploymentPoint, routeOffsets);
    const speed = VEHICLE_SPEED[vehicleId] ?? VEHICLE_SPEED.ugv;
    const initialRouteSample = sampleRoute(route, 0);
    const initialTerrainHeight = renderHeightMetersAt(initialRouteSample.x, initialRouteSample.z);
    const initialTerrainNormal = terrainNormalAt(initialRouteSample.x, initialRouteSample.z);

    const { pad, texture } = createDeploymentPad(
      initialTerrainNormal,
      initialTerrainHeight,
      deploymentPoint,
      vehicleId,
    );
    scene.add(pad);

    const { mount: vehicleMount, asset, size } = createVehicleModel(vehicleId);
    const contactEffect = createContactEffect(effectType);
    scene.add(contactEffect.points);
    const initialForward = new THREE.Vector3(initialRouteSample.tangent.x, 0, initialRouteSample.tangent.y);
    vehicleMount.position.set(
      initialRouteSample.x,
      initialTerrainHeight + (VEHICLE_ALTITUDE[vehicleId] ?? VEHICLE_ALTITUDE.ugv),
      initialRouteSample.z,
    );
    setForwardUpQuaternion(
      vehicleMount,
      initialForward,
      vehicleId === "drone" ? new THREE.Vector3(0, 1, 0) : initialTerrainNormal,
    );
    scene.add(vehicleMount);

    const fill = new THREE.DirectionalLight(0xbfe7ff, 1.1);
    fill.position.set(120, 240, -180);
    scene.add(fill);

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
    controls.target.copy(initialTarget);
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
    let routeDistance = 0;
    let runActive = runToken > 0;
    function tick(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (!simulationActiveRef.current) {
        runActive = false;
      }

      if (runActive) {
        routeDistance += speed * dt;
      }

      const routeSample = sampleRoute(route, routeDistance);
      const groundHeight = renderHeightMetersAt(routeSample.x, routeSample.z);
      const groundNormal = terrainNormalAt(routeSample.x, routeSample.z);
      const forward = new THREE.Vector3(routeSample.tangent.x, 0, routeSample.tangent.y);
      const vehicleHeight = VEHICLE_ALTITUDE[vehicleId] ?? VEHICLE_ALTITUDE.ugv;

      if (vehicleId === "drone") {
        vehicleMount.position.y =
          groundHeight + vehicleHeight + (runActive ? Math.sin(now / 1300) * 0.25 : 0);
        vehicleMount.position.x = routeSample.x;
        vehicleMount.position.z = routeSample.z;
        setForwardUpQuaternion(vehicleMount, forward, new THREE.Vector3(0, 1, 0));
        if (runActive) {
          contactEffect.emit(
            new THREE.Vector3(routeSample.x, groundHeight, routeSample.z),
            forward,
            groundHeight,
            0.45,
          );
        }
      } else {
        vehicleMount.position.set(routeSample.x, groundHeight + vehicleHeight, routeSample.z);
        setForwardUpQuaternion(vehicleMount, forward, groundNormal);
        if (runActive) {
          contactEffect.emit(vehicleMount.position, forward, groundHeight, 1);
        }
      }

      const desiredTarget = new THREE.Vector3(
        routeSample.x,
        groundHeight + targetLift,
        routeSample.z,
      );
      const followAlpha = 1 - Math.exp(-dt * 2.2);
      const targetDelta = desiredTarget.clone().sub(controls.target).multiplyScalar(followAlpha);
      controls.target.add(targetDelta);
      camera.position.add(targetDelta);

      if (runActive && asset && typeof asset.update === "function") {
        asset.update(dt);
      }
      contactEffect.update(dt);
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
      contactEffect.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mountEl) {
        mountEl.removeChild(renderer.domElement);
      }
      scene.traverse((obj) => {
        obj.geometry?.dispose?.();
      });
    };
  }, [
    addWorld,
    className,
    deploymentPoint,
    effectType,
    renderHeightMetersAt,
    routeOffsets,
    runToken,
    terrainNormalAt,
    vehicleId,
  ]);

  return <div ref={mountRef} className={className} />;
}
