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
const VEHICLE_VISUAL_SCALE = Object.freeze({ ugv: 1.3, drone: 3.1 });
const DRONE_FLIGHT_MOTION = Object.freeze({
  loiterRadiusX: 16,
  loiterRadiusZ: 10,
  loiterAngularSpeed: 0.28,
  idlePropSpinRadiansPerSecond: 68,
  activePropSpinRadiansPerSecond: 90,
  idleBankRadians: 0.28,
  activeBankRadians: 0.16,
  pitchRadians: 0.055,
  altitudeBobMeters: 0.38,
});
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
const AIRFLOW_COLORS = Object.freeze({
  dust: 0xd8edf2,
  mist: 0xe5f7ff,
  snow: 0xcfe8ff,
});
const AIRFLOW_STREAK_COUNT = 38;

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

  model.scale.setScalar(VEHICLE_VISUAL_SCALE[vehicleId] ?? 1);
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

function sampleDroneLoiter(deploymentPoint, elapsedSeconds) {
  const angle = elapsedSeconds * DRONE_FLIGHT_MOTION.loiterAngularSpeed + Math.PI * 0.22;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const x = deploymentPoint.x + cos * DRONE_FLIGHT_MOTION.loiterRadiusX;
  const z = deploymentPoint.z + sin * DRONE_FLIGHT_MOTION.loiterRadiusZ;
  const tangent = new THREE.Vector2(
    -sin * DRONE_FLIGHT_MOTION.loiterRadiusX,
    cos * DRONE_FLIGHT_MOTION.loiterRadiusZ,
  ).normalize();

  return {
    x,
    z,
    tangent,
    bankRadians: DRONE_FLIGHT_MOTION.idleBankRadians,
  };
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

function createAirWakeEffect(effectType) {
  const positions = new Float32Array(AIRFLOW_STREAK_COUNT * 2 * 3);
  const streaks = Array.from({ length: AIRFLOW_STREAK_COUNT }, () => ({
    age: 99,
    life: 1,
    origin: new THREE.Vector3(),
    forward: new THREE.Vector3(1, 0, 0),
    velocity: new THREE.Vector3(),
    length: 1,
    drift: 0,
  }));

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.LineBasicMaterial({
    color: AIRFLOW_COLORS[effectType] ?? AIRFLOW_COLORS.mist,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const lines = new THREE.LineSegments(geometry, material);
  lines.frustumCulled = false;
  let cursor = 0;

  function emit(origin, forward, intensity = 1) {
    if (Math.random() > 0.22 * intensity) return;

    const direction = forward.lengthSq() > 0.000001
      ? forward.clone().normalize()
      : new THREE.Vector3(1, 0, 0);
    const back = direction.clone().multiplyScalar(-1);
    const side = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
    const streak = streaks[cursor];
    cursor = (cursor + 1) % streaks.length;

    streak.age = 0;
    streak.life = 0.8 + Math.random() * 0.45;
    streak.length = 1.2 + Math.random() * 1.8;
    streak.drift = (Math.random() - 0.5) * 0.35;
    streak.forward.copy(back);
    streak.origin.copy(origin)
      .addScaledVector(back, 0.9 + Math.random() * 1.6)
      .addScaledVector(side, (Math.random() - 0.5) * 5.8);
    streak.origin.y += (Math.random() - 0.5) * 1.15;
    streak.velocity.copy(back)
      .multiplyScalar(1.15 + Math.random() * 0.9)
      .addScaledVector(side, (Math.random() - 0.5) * 0.55);
    streak.velocity.y = (Math.random() - 0.5) * 0.16;
  }

  function update(dt) {
    for (let i = 0; i < streaks.length; i += 1) {
      const streak = streaks[i];
      const base = i * 6;

      if (streak.age >= streak.life) {
        positions[base] = 0;
        positions[base + 1] = -9999;
        positions[base + 2] = 0;
        positions[base + 3] = 0;
        positions[base + 4] = -9999;
        positions[base + 5] = 0;
        continue;
      }

      streak.age += dt;
      streak.origin.addScaledVector(streak.velocity, dt);
      const t = Math.min(1, streak.age / streak.life);
      const currentLength = streak.length * (1 - t * 0.48);
      const wave = Math.sin((streak.age * 7.5) + streak.drift) * 0.08;

      positions[base] = streak.origin.x;
      positions[base + 1] = streak.origin.y + wave;
      positions[base + 2] = streak.origin.z;
      positions[base + 3] = streak.origin.x + streak.forward.x * currentLength;
      positions[base + 4] = streak.origin.y - wave * 0.4;
      positions[base + 5] = streak.origin.z + streak.forward.z * currentLength;
    }

    geometry.attributes.position.needsUpdate = true;
  }

  return {
    lines,
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
    const initialVehicleSample = vehicleId === "drone"
      ? sampleDroneLoiter(deploymentPoint, 0)
      : initialRouteSample;
    const initialTerrainHeight = renderHeightMetersAt(initialVehicleSample.x, initialVehicleSample.z);
    const initialTerrainNormal = terrainNormalAt(initialVehicleSample.x, initialVehicleSample.z);

    const { pad, texture } = createDeploymentPad(
      terrainNormalAt(deploymentPoint.x, deploymentPoint.z),
      renderHeightMetersAt(deploymentPoint.x, deploymentPoint.z),
      deploymentPoint,
      vehicleId,
    );
    scene.add(pad);

    const { mount: vehicleMount, asset, size } = createVehicleModel(vehicleId);
    const contactEffect = vehicleId === "drone" ? null : createContactEffect(effectType);
    const airWakeEffect = vehicleId === "drone" ? createAirWakeEffect(effectType) : null;
    if (contactEffect) scene.add(contactEffect.points);
    if (airWakeEffect) scene.add(airWakeEffect.lines);
    const initialForward = new THREE.Vector3(initialVehicleSample.tangent.x, 0, initialVehicleSample.tangent.y);
    vehicleMount.position.set(
      initialVehicleSample.x,
      initialTerrainHeight + (VEHICLE_ALTITUDE[vehicleId] ?? VEHICLE_ALTITUDE.ugv),
      initialVehicleSample.z,
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
    const frameDistance = vehicleId === "drone"
      ? Math.max(5.8, vehicleRadius * 2.5)
      : Math.max(9, vehicleRadius * 4.8);
    const targetLift = vehicleId === "drone" ? 8 : Math.max(1.1, size.y * 0.45);
    const initialTarget = new THREE.Vector3(
      initialVehicleSample.x,
      initialTerrainHeight + targetLift,
      initialVehicleSample.z,
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
    const startedAt = last;
    let routeDistance = 0;
    function tick(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const elapsedSeconds = (now - startedAt) / 1000;
      const runActive = runToken > 0 && simulationActiveRef.current;

      if (runActive) {
        routeDistance += speed * dt;
      }

      const routeSample = vehicleId === "drone" && !runActive
        ? sampleDroneLoiter(deploymentPoint, elapsedSeconds)
        : sampleRoute(route, routeDistance);
      const groundHeight = renderHeightMetersAt(routeSample.x, routeSample.z);
      const groundNormal = terrainNormalAt(routeSample.x, routeSample.z);
      const forward = new THREE.Vector3(routeSample.tangent.x, 0, routeSample.tangent.y);
      const vehicleHeight = VEHICLE_ALTITUDE[vehicleId] ?? VEHICLE_ALTITUDE.ugv;

      if (vehicleId === "drone") {
        const bob =
          Math.sin(elapsedSeconds * 1.9) * DRONE_FLIGHT_MOTION.altitudeBobMeters
          + Math.sin(elapsedSeconds * 0.77) * 0.16;
        vehicleMount.position.y =
          groundHeight + vehicleHeight + bob;
        vehicleMount.position.x = routeSample.x;
        vehicleMount.position.z = routeSample.z;
        setForwardUpQuaternion(vehicleMount, forward, new THREE.Vector3(0, 1, 0));
        vehicleMount.rotateX(
          routeSample.bankRadians
            ?? Math.sin(elapsedSeconds * 1.4) * DRONE_FLIGHT_MOTION.activeBankRadians,
        );
        vehicleMount.rotateZ(Math.sin(elapsedSeconds * 1.65) * DRONE_FLIGHT_MOTION.pitchRadians);
        airWakeEffect?.emit(vehicleMount.position, forward, runActive ? 1.0 : 0.55);
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

      if (asset && typeof asset.update === "function" && (runActive || vehicleId === "drone")) {
        asset.update(
          dt,
          vehicleId === "drone"
            ? {
              propSpinRadiansPerSecond: runActive
                ? DRONE_FLIGHT_MOTION.activePropSpinRadiansPerSecond
                : DRONE_FLIGHT_MOTION.idlePropSpinRadiansPerSecond,
            }
            : undefined,
        );
      }
      contactEffect?.update(dt);
      airWakeEffect?.update(dt);
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
      contactEffect?.dispose();
      airWakeEffect?.dispose();
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
