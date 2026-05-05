import { useEffect, useRef } from "react";
import * as THREE from "three";

import "../assets/cad/teledyne_flir_centaur_land/centaur_land_threejs.js";
import "../assets/cad/rq11b_raven_air/rq11b_raven_threejs.js";
import {
  createIranMaranjabDuneFieldsScene,
  renderHeightMetersAt as renderIranMaranjabHeightMetersAt,
} from "../terrains/iran_maranjab_dune_fields_topo_terrain.js";
import {
  createTaiwanHumidTopoScene,
  renderHeightMetersAt as renderTaiwanHeightMetersAt,
} from "../terrains/taiwan_humid_topo_terrain.js";
import {
  createThompsonPassSnowTopoScene,
  renderHeightMetersAt as renderThompsonHeightMetersAt,
} from "../terrains/thompson_pass_snow_topo_terrain.js";

const VEHICLE_FACTORIES = {
  ugv: { globalKey: "CentaurLandThreeJS", factoryKey: "createCentaurLandSurrogate" },
  drone: { globalKey: "RavenAirThreeJS", factoryKey: "createRavenAirSurrogate" },
};

const TERRAIN_SCENES = {
  arctic: {
    createScene: createThompsonPassSnowTopoScene,
    renderHeightMetersAt: renderThompsonHeightMetersAt,
    deploymentPoint: Object.freeze({ x: -36, z: -18 }),
    effectType: "snow",
  },
  hormuz: {
    createScene: createIranMaranjabDuneFieldsScene,
    renderHeightMetersAt: renderIranMaranjabHeightMetersAt,
    deploymentPoint: Object.freeze({ x: -42, z: 12 }),
    effectType: "dust",
  },
  taiwan: {
    createScene: createTaiwanHumidTopoScene,
    renderHeightMetersAt: renderTaiwanHeightMetersAt,
    deploymentPoint: Object.freeze({ x: -24, z: -24 }),
    effectType: "mist",
  },
};

const VEHICLE_ALTITUDE = Object.freeze({ ugv: 0.08, drone: 14 });
const VEHICLE_SPEED = Object.freeze({ ugv: 1.25, drone: 9.2 });
const VEHICLE_ROUTE_COLORS = Object.freeze({ ugv: 0x6ee7b7, drone: 0x38bdf8 });
const VEHICLE_ROUTE_Y_OFFSET = Object.freeze({ ugv: 0.3, drone: 0 });
const VEHICLE_TERRAIN_VIEW_SCALE = Object.freeze({ ugv: 1, drone: 2 });
const RUN_DURATION_SECONDS = 13;

const GROUND_ROUTE_OFFSETS = Object.freeze([
  Object.freeze({ x: 0, z: 0 }),
  Object.freeze({ x: 24, z: -18 }),
  Object.freeze({ x: 54, z: -8 }),
  Object.freeze({ x: 68, z: 24 }),
  Object.freeze({ x: 28, z: 52 }),
  Object.freeze({ x: -18, z: 34 }),
  Object.freeze({ x: -34, z: 4 }),
]);

const AIR_ROUTE_OFFSETS = Object.freeze([
  Object.freeze({ x: -6, z: -2 }),
  Object.freeze({ x: 48, z: -42 }),
  Object.freeze({ x: 98, z: -20 }),
  Object.freeze({ x: 104, z: 44 }),
  Object.freeze({ x: 38, z: 86 }),
  Object.freeze({ x: -50, z: 68 }),
  Object.freeze({ x: -78, z: 2 }),
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

function terrainNormalAt(renderHeightMetersAt, x, z, sample = 4) {
  const left = renderHeightMetersAt(x - sample, z);
  const right = renderHeightMetersAt(x + sample, z);
  const down = renderHeightMetersAt(x, z - sample);
  const up = renderHeightMetersAt(x, z + sample);
  const east = new THREE.Vector3(sample * 2, right - left, 0);
  const north = new THREE.Vector3(0, up - down, sample * 2);
  return new THREE.Vector3().crossVectors(north, east).normalize();
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
  pad.name = `${vehicleId}_terrain_deployment_pad`;

  return { pad, texture };
}

function createRoute(deploymentPoint, routeOffsets) {
  const points = routeOffsets.map((point) => new THREE.Vector2(
    deploymentPoint.x + point.x,
    deploymentPoint.z + point.z,
  ));
  const segments = [];
  let totalLength = 0;

  for (let i = 0; i < points.length; i += 1) {
    const from = points[i];
    const to = points[(i + 1) % points.length];
    const length = from.distanceTo(to);
    segments.push({ from, to, length, start: totalLength });
    totalLength += length;
  }

  return { segments, totalLength };
}

function sampleRoute(route, distanceMeters) {
  const wrapped = ((distanceMeters % route.totalLength) + route.totalLength) % route.totalLength;
  const segment = route.segments.find((s) => wrapped >= s.start && wrapped <= s.start + s.length)
    ?? route.segments[0];
  const local = segment.length > 0 ? (wrapped - segment.start) / segment.length : 0;
  const x = THREE.MathUtils.lerp(segment.from.x, segment.to.x, local);
  const z = THREE.MathUtils.lerp(segment.from.y, segment.to.y, local);
  const tangent = new THREE.Vector2(
    segment.to.x - segment.from.x,
    segment.to.y - segment.from.y,
  ).normalize();

  return { x, z, tangent };
}

function createRouteLine(route, renderHeightMetersAt, vehicleId) {
  const sampleCount = 220;
  const altitude = VEHICLE_ALTITUDE[vehicleId] ?? 0;
  const yOffset = VEHICLE_ROUTE_Y_OFFSET[vehicleId] ?? 0.2;
  const points = [];

  for (let i = 0; i <= sampleCount; i += 1) {
    const routeSample = sampleRoute(route, route.totalLength * (i / sampleCount));
    const groundHeight = renderHeightMetersAt(routeSample.x, routeSample.z);
    points.push(new THREE.Vector3(
      routeSample.x,
      groundHeight + altitude + yOffset,
      routeSample.z,
    ));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: VEHICLE_ROUTE_COLORS[vehicleId] ?? VEHICLE_ROUTE_COLORS.ugv,
    transparent: true,
    opacity: vehicleId === "drone" ? 0.52 : 0.68,
    depthWrite: false,
  });
  const line = new THREE.Line(geometry, material);
  line.name = `${vehicleId}_terrain_route_trace`;
  line.renderOrder = vehicleId === "drone" ? 3 : 2;
  return line;
}

function createAirShadow() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 192;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(96, 96, 5, 96, 96, 92);
  grad.addColorStop(0, "rgba(0,0,0,0.32)");
  grad.addColorStop(0.55, "rgba(0,0,0,0.12)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 192, 192);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(4.8, 56),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  shadow.name = "raven_air_uas_moving_terrain_shadow";
  shadow.renderOrder = 4;

  return { shadow, texture };
}

function setForwardUpQuaternion(object, forward, up) {
  const xAxis = forward.lengthSq() > 0.000001
    ? forward.clone().normalize()
    : new THREE.Vector3(0, 0, 1);
  const yAxis = up.lengthSq() > 0.000001
    ? up.clone().normalize()
    : new THREE.Vector3(0, 1, 0);

  xAxis.projectOnPlane(yAxis).normalize();
  const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();
  const correctedUp = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();
  const matrix = new THREE.Matrix4().makeBasis(xAxis, correctedUp, zAxis);
  object.quaternion.setFromRotationMatrix(matrix);
}

function createContactEffect(effectType) {
  const positions = new Float32Array(EFFECT_PARTICLE_COUNT * 3);
  for (let i = 0; i < EFFECT_PARTICLE_COUNT; i += 1) {
    positions[(i * 3) + 1] = -9999;
  }
  const particles = Array.from({ length: EFFECT_PARTICLE_COUNT }, () => ({
    age: 99,
    life: 1,
    velocity: new THREE.Vector3(),
    origin: new THREE.Vector3(),
    scale: 1,
  }));

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: EFFECT_COLORS[effectType] ?? EFFECT_COLORS.dust,
    size: effectType === "snow" ? 0.26 : 0.34,
    transparent: true,
    opacity: effectType === "mist" ? 0.34 : 0.48,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 6;
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
      particle.life = effectType === "snow" ? 1 + Math.random() * 0.45 : 0.75 + Math.random() * 0.45;
      particle.origin.copy(origin)
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

      if (particle.age >= particle.life) {
        positions[base] = 0;
        positions[base + 1] = -9999;
        positions[base + 2] = 0;
        continue;
      }

      particle.age += dt;
      particle.velocity.y += (effectType === "snow" ? 0.08 : 0.18) * dt;
      particle.velocity.multiplyScalar(1 - dt * 0.7);
      particle.origin.addScaledVector(particle.velocity, dt);

      positions[base] = particle.origin.x;
      positions[base + 1] = particle.origin.y;
      positions[base + 2] = particle.origin.z;
    }

    geometry.attributes.position.needsUpdate = true;
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

function disposeObjectTree(root) {
  root.traverse((obj) => {
    obj.geometry?.dispose?.();
    if (obj.material) {
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const material of materials) material.dispose?.();
    }
  });
}

function frameCamera(terrainApi, target, vehicleRadius, vehicleId) {
  const frameDistance = vehicleId === "drone"
    ? Math.max(86, vehicleRadius * 18)
    : Math.max(72, vehicleRadius * 20);

  terrainApi.camera.near = 0.05;
  terrainApi.camera.position.set(
    target.x + frameDistance * 0.96,
    target.y + frameDistance * 0.46,
    target.z + frameDistance * 1.08,
  );
  terrainApi.camera.lookAt(target);
  terrainApi.camera.updateProjectionMatrix();

  terrainApi.controls.target.copy(target);
  terrainApi.controls.minDistance = Math.max(5, vehicleRadius * 1.6);
  terrainApi.controls.maxDistance = 1050;
  terrainApi.controls.maxPolarAngle = THREE.MathUtils.degToRad(88);
  terrainApi.controls.update();
}

export function TerrainVehicleScene({ theaterId, vehicleId, runToken = 0 }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return undefined;

    const terrainConfig = TERRAIN_SCENES[theaterId] ?? TERRAIN_SCENES.arctic;
    const renderHeightMetersAt = terrainConfig.renderHeightMetersAt;
    const deploymentPoint = terrainConfig.deploymentPoint;
    const routeOffsets = vehicleId === "drone" ? AIR_ROUTE_OFFSETS : GROUND_ROUTE_OFFSETS;
    const route = createRoute(deploymentPoint, routeOffsets);

    const terrainApi = terrainConfig.createScene(mountEl, { maxPixelRatio: 1.7 });
    const integrationRoot = new THREE.Group();
    integrationRoot.name = "landforge_vehicle_terrain_integration";
    terrainApi.scene.add(integrationRoot);

    const deploymentTerrainHeight = renderHeightMetersAt(deploymentPoint.x, deploymentPoint.z);
    const deploymentTerrainNormal = terrainNormalAt(renderHeightMetersAt, deploymentPoint.x, deploymentPoint.z);
    const { pad, texture: padTexture } = createDeploymentPad(
      deploymentTerrainNormal,
      deploymentTerrainHeight,
      deploymentPoint,
      vehicleId,
    );
    integrationRoot.add(pad);

    const routeLine = createRouteLine(route, renderHeightMetersAt, vehicleId);
    integrationRoot.add(routeLine);

    const contactEffect = createContactEffect(terrainConfig.effectType);
    integrationRoot.add(contactEffect.points);

    const { mount: vehicleMount, asset, size } = createVehicleModel(vehicleId);
    const viewScale = VEHICLE_TERRAIN_VIEW_SCALE[vehicleId] ?? 1;
    vehicleMount.scale.setScalar(viewScale);
    size.multiplyScalar(viewScale);
    vehicleMount.name = `${vehicleId}_terrain_vehicle_mount`;
    integrationRoot.add(vehicleMount);

    const airShadow = vehicleId === "drone" ? createAirShadow() : null;
    if (airShadow) integrationRoot.add(airShadow.shadow);

    const unit = {
      route,
      routeDistance: vehicleId === "drone" ? 10 : 0,
      speed: VEHICLE_SPEED[vehicleId] ?? VEHICLE_SPEED.ugv,
      altitude: VEHICLE_ALTITUDE[vehicleId] ?? VEHICLE_ALTITUDE.ugv,
      mount: vehicleMount,
      asset,
      shadow: airShadow?.shadow ?? null,
      shadowTexture: airShadow?.texture ?? null,
      currentGroundHeight: deploymentTerrainHeight,
      currentPosition: new THREE.Vector3(),
    };

    function placeUnit(now = performance.now()) {
      const routeSample = sampleRoute(unit.route, unit.routeDistance);
      const groundHeight = renderHeightMetersAt(routeSample.x, routeSample.z);
      const groundNormal = terrainNormalAt(renderHeightMetersAt, routeSample.x, routeSample.z);
      const forward = new THREE.Vector3(routeSample.tangent.x, 0, routeSample.tangent.y);

      if (vehicleId === "drone") {
        const aheadSample = sampleRoute(unit.route, unit.routeDistance + 14);
        const aheadForward = new THREE.Vector3(aheadSample.tangent.x, 0, aheadSample.tangent.y);
        const turn = forward.x * aheadForward.z - forward.z * aheadForward.x;
        const bank = THREE.MathUtils.clamp(-turn * 0.78, -0.5, 0.5);
        const up = new THREE.Vector3(0, 1, 0).applyAxisAngle(forward, bank);
        const flightFloat = Math.sin(now / 1100 + unit.routeDistance * 0.02) * 0.22;

        unit.mount.position.set(routeSample.x, groundHeight + unit.altitude + flightFloat, routeSample.z);
        setForwardUpQuaternion(unit.mount, forward, up);

        if (unit.shadow) {
          unit.shadow.position.set(routeSample.x, groundHeight + 0.08, routeSample.z);
          unit.shadow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), groundNormal);
          const shadowScale = THREE.MathUtils.clamp(1 + unit.altitude / 12, 1.35, 2.4);
          unit.shadow.scale.set(shadowScale * 1.25, shadowScale * 0.72, 1);
          unit.shadow.material.opacity = THREE.MathUtils.clamp(0.34 - unit.altitude * 0.009, 0.12, 0.22);
        }
      } else {
        unit.mount.position.set(routeSample.x, groundHeight + unit.altitude, routeSample.z);
        setForwardUpQuaternion(unit.mount, forward, groundNormal);
      }

      unit.currentGroundHeight = groundHeight;
      unit.currentPosition.copy(unit.mount.position);
      return { forward, groundHeight };
    }

    placeUnit();

    const vehicleRadius = Math.max(size.x, size.y, size.z) * 0.5;
    const initialTarget = unit.currentPosition.clone();
    initialTarget.y = vehicleId === "drone"
      ? unit.currentPosition.y - 4
      : unit.currentGroundHeight + Math.max(4.5, vehicleRadius * 0.7);
    frameCamera(terrainApi, initialTarget, vehicleRadius, vehicleId);

    let raf = 0;
    let last = performance.now();
    let runElapsed = 0;
    let runActive = runToken > 0;

    function tick(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (runActive) {
        runElapsed += dt;
        unit.routeDistance += unit.speed * dt;
        if (runElapsed >= RUN_DURATION_SECONDS) runActive = false;
      }

      const { forward, groundHeight } = placeUnit(now);
      if (runActive && vehicleId === "ugv") {
        contactEffect.emit(unit.mount.position, forward, groundHeight, 1);
      }
      contactEffect.update(dt);

      if (asset && typeof asset.update === "function") {
        asset.update(dt);
      }

      const desiredTarget = unit.currentPosition.clone();
      desiredTarget.y = vehicleId === "drone"
        ? unit.currentPosition.y - 4
        : unit.currentGroundHeight + Math.max(4.5, vehicleRadius * 0.7);
      const followAlpha = 1 - Math.exp(-dt * 2.2);
      const targetDelta = desiredTarget.sub(terrainApi.controls.target).multiplyScalar(followAlpha);
      terrainApi.controls.target.add(targetDelta);
      terrainApi.camera.position.add(targetDelta);

      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      terrainApi.scene.remove(integrationRoot);
      padTexture.dispose();
      unit.shadowTexture?.dispose?.();
      contactEffect.dispose();
      disposeObjectTree(integrationRoot);
      terrainApi.dispose();
    };
  }, [theaterId, vehicleId, runToken]);

  return <div ref={mountRef} className="terrain-vehicle-scene mapped-terrain-scene" />;
}
