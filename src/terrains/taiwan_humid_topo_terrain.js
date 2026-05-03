import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export const TAIWAN_HUMID_TOPO_CONFIG = Object.freeze({
  name: "Taiwan Humid Topographic Terrain",
  center: {
    latitude: 24.6769,
    longitude: 121.7704,
  },
  location: "Luodong, Yilan Plain, Taiwan",
  centerElevationMetersAsl: 18,
  terrainSizeMeters: 1000,
  verticalExaggeration: 1,
  contourIntervalMeters: 25,
  note:
    "Procedural public terrain model inspired by humid lowland and foothill terrain on Taiwan's Yilan Plain. It is not a surveyed DEM tile.",
});

const CONFIG = TAIWAN_HUMID_TOPO_CONFIG;
const TERRAIN_SIZE = CONFIG.terrainSizeMeters;
const HALF_TERRAIN = TERRAIN_SIZE / 2;
const GRID_SEGMENTS = 220;
const VERTICAL_EXAGGERATION = CONFIG.verticalExaggeration;
const SEED = 248652;
const SKY_COLOR = 0xd7eefb;
const FOG_COLOR = SKY_COLOR;
const CANOPY_VIBRANCY_MULTIPLIER = 1.75;
const RADIAL_FOG = Object.freeze({
  innerRadiusMeters: 500,
  outerRadiusMeters: 1000,
  innerAlpha: 0.5,
  outerAlpha: 1,
  edgeFadeStartMeters: 560,
  edgeOpaqueMeters: 760,
});
const CAMERA_COLLISION = Object.freeze({
  nearPlaneMeters: 0.08,
  minOrbitDistanceMeters: 118,
  maxPolarAngleDegrees: 78,
  groundClearanceMeters: 42,
  targetGroundClearanceMeters: 12,
  targetEdgePaddingMeters: 18,
});

const MATERIALS = {
  wetRock: new THREE.MeshStandardMaterial({
    color: 0x59635c,
    roughness: 0.98,
    metalness: 0.02,
  }),
  treeTrunk: new THREE.MeshStandardMaterial({
    color: 0x493829,
    roughness: 0.96,
    metalness: 0,
  }),
  canopyDeep: new THREE.MeshStandardMaterial({
    color: 0xedffef,
    emissive: 0x10381f,
    emissiveIntensity: 0.28,
    roughness: 0.98,
    metalness: 0,
    vertexColors: true,
  }),
  canopyLight: new THREE.MeshStandardMaterial({
    color: 0xf2ffe7,
    emissive: 0x2d5a24,
    emissiveIntensity: 0.315,
    roughness: 0.98,
    metalness: 0,
    vertexColors: true,
  }),
  contourMinor: new THREE.LineBasicMaterial({
    color: 0x416054,
    transparent: true,
    opacity: 0.45,
    fog: true,
  }),
  contourMajor: new THREE.LineBasicMaterial({
    color: 0x1f3f38,
    transparent: true,
    opacity: 0.72,
    fog: true,
  }),
  wetTrail: new THREE.MeshStandardMaterial({
    color: 0x6d6a55,
    roughness: 0.98,
    metalness: 0,
    transparent: true,
    opacity: 0.62,
  }),
  flowerStem: new THREE.MeshStandardMaterial({
    color: 0x3f6038,
    roughness: 0.96,
    metalness: 0,
  }),
  flowerWhite: new THREE.MeshStandardMaterial({
    color: 0xf1ead0,
    roughness: 0.88,
    metalness: 0,
  }),
  flowerPink: new THREE.MeshStandardMaterial({
    color: 0xd99ca2,
    roughness: 0.9,
    metalness: 0,
  }),
  flowerYellow: new THREE.MeshStandardMaterial({
    color: 0xd9c05b,
    roughness: 0.9,
    metalness: 0,
  }),
};

export function createTaiwanHumidTopoScene(container = document.body, options = {}) {
  const target = typeof container === "string" ? document.querySelector(container) : container;

  if (!target) {
    throw new Error("Three.js terrain container was not found.");
  }

  const scene = new THREE.Scene();
  scene.name = CONFIG.name;
  scene.background = new THREE.Color(SKY_COLOR);
  scene.fog = new THREE.Fog(FOG_COLOR, 540, 1180);

  const camera = new THREE.PerspectiveCamera(54, 1, CAMERA_COLLISION.nearPlaneMeters, 2400);
  camera.position.set(420, 330, 610);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, options.maxPixelRatio ?? 1.8));
  renderer.setSize(target.clientWidth || window.innerWidth, target.clientHeight || window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  target.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 72, 0);
  controls.enableDamping = true;
  controls.maxDistance = 1050;
  controls.minDistance = CAMERA_COLLISION.minOrbitDistanceMeters;
  controls.maxPolarAngle = THREE.MathUtils.degToRad(CAMERA_COLLISION.maxPolarAngleDegrees);
  controls.update();

  addLighting(scene);

  const terrainData = buildTerrainData();
  addTerrain(scene, terrainData);
  addContourLines(scene, terrainData);
  addWetFootpath(scene);
  addWetRockOutcrops(scene, terrainData);
  addRainforestTrees(scene, terrainData);
  addFlowers(scene, terrainData);
  addFogBoundaryPlane(scene);
  addScaleReference(scene);
  applyRadialFogToScene(scene);

  const resize = () => {
    const width = target.clientWidth || window.innerWidth;
    const height = target.clientHeight || window.innerHeight;
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(target);
  window.addEventListener("resize", resize);

  updateTerrainCamera(camera, controls);
  renderer.render(scene, camera);

  renderer.setAnimationLoop(() => {
    updateTerrainCamera(camera, controls);
    renderer.render(scene, camera);
  });

  return {
    scene,
    camera,
    renderer,
    controls,
    config: CONFIG,
    dispose() {
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      window.removeEventListener("resize", resize);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

function updateTerrainCamera(camera, controls) {
  controls.update();

  if (constrainCameraToTerrain(camera, controls)) {
    controls.update();
  }
}

function constrainCameraToTerrain(camera, controls) {
  let changed = false;
  const targetLimit = HALF_TERRAIN - CAMERA_COLLISION.targetEdgePaddingMeters;

  const targetX = THREE.MathUtils.clamp(controls.target.x, -targetLimit, targetLimit);
  const targetZ = THREE.MathUtils.clamp(controls.target.z, -targetLimit, targetLimit);

  if (targetX !== controls.target.x || targetZ !== controls.target.z) {
    controls.target.x = targetX;
    controls.target.z = targetZ;
    changed = true;
  }

  const targetGround = renderHeightMetersAt(controls.target.x, controls.target.z);
  const minimumTargetY = targetGround + CAMERA_COLLISION.targetGroundClearanceMeters;

  if (controls.target.y < minimumTargetY) {
    controls.target.y = minimumTargetY;
    changed = true;
  }

  const cameraGround = renderHeightMetersAt(camera.position.x, camera.position.z);
  const minimumCameraY = cameraGround + CAMERA_COLLISION.groundClearanceMeters;

  if (camera.position.y < minimumCameraY) {
    camera.position.y = minimumCameraY;
    changed = true;
  }

  const offset = camera.position.clone().sub(controls.target);
  const distance = offset.length();

  if (distance < CAMERA_COLLISION.minOrbitDistanceMeters) {
    if (distance < 0.001) {
      offset.set(0, CAMERA_COLLISION.minOrbitDistanceMeters, 0);
    } else {
      offset.setLength(CAMERA_COLLISION.minOrbitDistanceMeters);
    }

    camera.position.copy(controls.target).add(offset);
    changed = true;
  }

  return changed;
}

export function terrainElevationMetersAt(xMetersEast, zMetersNorth) {
  const valleyAxis = riverAxisAt(zMetersNorth);
  const across = xMetersEast - valleyAxis;
  const along = zMetersNorth;
  const normalizedAcross = Math.abs(across) / HALF_TERRAIN;
  const normalizedAlong = along / HALF_TERRAIN;

  const riverCut = -18 * Math.exp(-Math.pow(across / 86, 2)) * (0.92 + 0.08 * Math.sin(along * 0.017));
  const westWall = 20 * smoothRamp(Math.max(0, (-across - 175) / 470), 1.24);
  const eastWall = 74 * smoothRamp(Math.max(0, (across - 118) / 450), 1.42);
  const northRise = 16 * smoothRamp(Math.max(0, normalizedAlong + 0.08), 1.1);
  const southShoulder = 9 * smoothRamp(Math.max(0, -normalizedAlong - 0.08), 1.04);
  const convexSpurs =
    9 * Math.exp(-Math.pow((across + 240) / 140, 2)) * Math.exp(-Math.pow((along + 130) / 390, 2)) +
    18 * Math.exp(-Math.pow((across - 255) / 128, 2)) * Math.exp(-Math.pow((along - 95) / 420, 2));
  const riverTerraces =
    -5.5 *
      Math.exp(-Math.pow((Math.abs(across) - 112) / 54, 2)) *
      Math.exp(-Math.pow((along + 105) / 430, 2)) +
    -4 *
      Math.exp(-Math.pow((Math.abs(across) - 180) / 66, 2)) *
      Math.exp(-Math.pow((along - 190) / 410, 2));

  const tributaryGullies =
    -8.5 * gully(across + 215 + 20 * Math.sin(along * 0.019), along, -250, 310) +
    -8 * gully(across - 240 + 22 * Math.cos(along * 0.016), along, -40, 340) +
    -5.5 * gully(across + 330 - 16 * Math.sin(along * 0.014), along, 210, 285) +
    -4.5 * gully(across - 115, along, 315, 250);

  const ridgeRoughness =
    5.8 * fbm(xMetersEast * 0.012 + 8, zMetersNorth * 0.012 - 3, 5) * Math.min(1, normalizedAcross * 1.35) +
    2.8 * fbm(xMetersEast * 0.029 - 19, zMetersNorth * 0.029 + 11, 4);

  const wetUndulation =
    3.2 * Math.sin((along + 90) * 0.014) * Math.exp(-Math.pow(across / 300, 2)) +
    2.4 * Math.cos((xMetersEast - zMetersNorth) * 0.01);

  return (
    riverCut +
    westWall +
    eastWall +
    northRise +
    southShoulder +
    convexSpurs +
    riverTerraces +
    tributaryGullies +
    ridgeRoughness +
    wetUndulation +
    7
  );
}

export function renderHeightMetersAt(xMetersEast, zMetersNorth) {
  return terrainElevationMetersAt(xMetersEast, zMetersNorth) * VERTICAL_EXAGGERATION;
}

export function addTaiwanHumidTopoWorld(scene, options = {}) {
  scene.name = CONFIG.name;

  if (options.fog !== false) {
    scene.background = new THREE.Color(FOG_COLOR);
    scene.fog = new THREE.Fog(FOG_COLOR, 540, 1180);
  }

  if (options.lighting !== false) {
    addLighting(scene);
  }

  const terrainData = buildTerrainData();
  addTerrain(scene, terrainData);
  addContourLines(scene, terrainData);
  addWetFootpath(scene);
  addWetRockOutcrops(scene, terrainData);
  addRainforestTrees(scene, terrainData);
  addFlowers(scene, terrainData);
  addFogBoundaryPlane(scene);
  addScaleReference(scene);
  applyRadialFogToScene(scene);

  return {
    config: CONFIG,
    terrainData,
    centerHeightMeters: renderHeightMetersAt(0, 0),
  };
}

export function terrainNormalAt(xMetersEast, zMetersNorth, sampleMeters = 4.5) {
  const left = renderHeightMetersAt(xMetersEast - sampleMeters, zMetersNorth);
  const right = renderHeightMetersAt(xMetersEast + sampleMeters, zMetersNorth);
  const down = renderHeightMetersAt(xMetersEast, zMetersNorth - sampleMeters);
  const up = renderHeightMetersAt(xMetersEast, zMetersNorth + sampleMeters);
  const east = new THREE.Vector3(sampleMeters * 2, right - left, 0);
  const north = new THREE.Vector3(0, up - down, sampleMeters * 2);

  return new THREE.Vector3().crossVectors(north, east).normalize();
}

export function metersToLatLon(xMetersEast, zMetersNorth) {
  const metersPerDegreeLatitude = 111_320;
  const metersPerDegreeLongitude =
    111_320 * Math.cos(THREE.MathUtils.degToRad(CONFIG.center.latitude));

  return {
    latitude: CONFIG.center.latitude + zMetersNorth / metersPerDegreeLatitude,
    longitude: CONFIG.center.longitude + xMetersEast / metersPerDegreeLongitude,
  };
}

function riverAxisAt(zMetersNorth) {
  return (
    50 * Math.sin(zMetersNorth * 0.0064 + 0.35) +
    24 * Math.sin(zMetersNorth * 0.015 + 0.9) -
    15 * Math.cos(zMetersNorth * 0.0035)
  );
}

function addLighting(scene) {
  const hemisphere = new THREE.HemisphereLight(0xf4fff7, 0x3d4f45, 1.75);
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight(0xfff2cf, 2.35);
  sun.position.set(-420, 690, 330);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -760;
  sun.shadow.camera.right = 760;
  sun.shadow.camera.top = 760;
  sun.shadow.camera.bottom = -760;
  sun.shadow.camera.near = 80;
  sun.shadow.camera.far = 1300;
  scene.add(sun);
}

function buildTerrainData() {
  const verticesPerSide = GRID_SEGMENTS + 1;
  const step = TERRAIN_SIZE / GRID_SEGMENTS;
  const positions = new Float32Array(verticesPerSide * verticesPerSide * 3);
  const colors = new Float32Array(verticesPerSide * verticesPerSide * 3);
  const relativeElevations = new Float32Array(verticesPerSide * verticesPerSide);
  const slopeValues = new Float32Array(verticesPerSide * verticesPerSide);
  const indices = [];

  let minElevation = Number.POSITIVE_INFINITY;
  let maxElevation = Number.NEGATIVE_INFINITY;
  let positionIndex = 0;
  let colorIndex = 0;
  let scalarIndex = 0;

  for (let zIndex = 0; zIndex <= GRID_SEGMENTS; zIndex += 1) {
    const z = -HALF_TERRAIN + zIndex * step;

    for (let xIndex = 0; xIndex <= GRID_SEGMENTS; xIndex += 1) {
      const x = -HALF_TERRAIN + xIndex * step;
      const elevation = terrainElevationMetersAt(x, z);
      const y = elevation * VERTICAL_EXAGGERATION;
      const slope = terrainSlopeAt(x, z);
      const color = humidTerrainColorAt(x, z, elevation, slope);

      positions[positionIndex++] = x;
      positions[positionIndex++] = y;
      positions[positionIndex++] = z;
      colors[colorIndex++] = color.r;
      colors[colorIndex++] = color.g;
      colors[colorIndex++] = color.b;
      relativeElevations[scalarIndex] = elevation;
      slopeValues[scalarIndex] = slope;
      scalarIndex += 1;

      minElevation = Math.min(minElevation, elevation);
      maxElevation = Math.max(maxElevation, elevation);
    }
  }

  for (let zIndex = 0; zIndex < GRID_SEGMENTS; zIndex += 1) {
    for (let xIndex = 0; xIndex < GRID_SEGMENTS; xIndex += 1) {
      const a = zIndex * verticesPerSide + xIndex;
      const b = a + 1;
      const c = a + verticesPerSide;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  return {
    positions,
    colors,
    indices,
    relativeElevations,
    slopeValues,
    verticesPerSide,
    step,
    minElevation,
    maxElevation,
  };
}

function addTerrain(scene, terrainData) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(terrainData.positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(terrainData.colors, 3));
  geometry.setIndex(terrainData.indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.99,
    metalness: 0,
  });

  const terrain = new THREE.Mesh(geometry, material);
  terrain.name = "1 km square humid Taiwan topographic terrain";
  terrain.receiveShadow = true;
  scene.add(terrain);
}

function addContourLines(scene, terrainData) {
  const minorSegments = [];
  const majorSegments = [];
  const interval = CONFIG.contourIntervalMeters;
  const firstLevel = Math.ceil(terrainData.minElevation / interval) * interval;
  const lastLevel = Math.floor(terrainData.maxElevation / interval) * interval;

  for (let level = firstLevel; level <= lastLevel; level += interval) {
    const target = Math.abs(level % 100) < 0.001 ? majorSegments : minorSegments;
    traceContourLevel(terrainData, level, target);
  }

  const minor = createLineSegments(minorSegments, MATERIALS.contourMinor, "minor 25 meter contour lines");
  const major = createLineSegments(majorSegments, MATERIALS.contourMajor, "major 100 meter contour lines");
  scene.add(minor);
  scene.add(major);
}

function traceContourLevel(terrainData, level, targetSegments) {
  const verticesPerSide = terrainData.verticesPerSide;
  const step = terrainData.step;

  for (let zIndex = 0; zIndex < GRID_SEGMENTS; zIndex += 1) {
    for (let xIndex = 0; xIndex < GRID_SEGMENTS; xIndex += 1) {
      const i0 = zIndex * verticesPerSide + xIndex;
      const i1 = i0 + 1;
      const i2 = i0 + verticesPerSide + 1;
      const i3 = i0 + verticesPerSide;

      const corners = [
        vertexAt(xIndex, zIndex, terrainData.relativeElevations[i0], step),
        vertexAt(xIndex + 1, zIndex, terrainData.relativeElevations[i1], step),
        vertexAt(xIndex + 1, zIndex + 1, terrainData.relativeElevations[i2], step),
        vertexAt(xIndex, zIndex + 1, terrainData.relativeElevations[i3], step),
      ];

      const intersections = [];
      addContourIntersection(corners[0], corners[1], level, intersections);
      addContourIntersection(corners[1], corners[2], level, intersections);
      addContourIntersection(corners[2], corners[3], level, intersections);
      addContourIntersection(corners[3], corners[0], level, intersections);

      if (intersections.length === 2) {
        pushContourSegment(targetSegments, intersections[0], intersections[1]);
      } else if (intersections.length === 4) {
        pushContourSegment(targetSegments, intersections[0], intersections[1]);
        pushContourSegment(targetSegments, intersections[2], intersections[3]);
      }
    }
  }
}

function vertexAt(xIndex, zIndex, elevation, step) {
  const x = -HALF_TERRAIN + xIndex * step;
  const z = -HALF_TERRAIN + zIndex * step;
  return { x, z, elevation };
}

function addContourIntersection(a, b, level, intersections) {
  const aDelta = a.elevation - level;
  const bDelta = b.elevation - level;

  if (Math.abs(aDelta) < 0.00001 && Math.abs(bDelta) < 0.00001) {
    return;
  }

  if ((aDelta <= 0 && bDelta >= 0) || (aDelta >= 0 && bDelta <= 0)) {
    const denominator = b.elevation - a.elevation;
    if (Math.abs(denominator) < 0.00001) {
      return;
    }

    const t = (level - a.elevation) / denominator;
    if (t < 0 || t > 1) {
      return;
    }

    intersections.push({
      x: THREE.MathUtils.lerp(a.x, b.x, t),
      z: THREE.MathUtils.lerp(a.z, b.z, t),
      elevation: level,
    });
  }
}

function pushContourSegment(target, a, b) {
  const ay = renderHeightMetersAt(a.x, a.z) + 1.35;
  const by = renderHeightMetersAt(b.x, b.z) + 1.35;
  target.push(a.x, ay, a.z, b.x, by, b.z);
}

function createLineSegments(positions, material, name) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const lines = new THREE.LineSegments(geometry, material);
  lines.name = name;
  return lines;
}

function addWetFootpath(scene) {
  const points = [];

  for (let i = 0; i <= 34; i += 1) {
    const z = THREE.MathUtils.lerp(-500, 500, i / 34);
    const x = riverAxisAt(z) + 116 + 18 * Math.sin(z * 0.012);
    points.push(new THREE.Vector2(x, z));
  }

  const path = new THREE.Mesh(createRibbonGeometry(points, 15, 0.74), MATERIALS.wetTrail);
  path.name = "narrow wet hillside footpath";
  path.receiveShadow = true;
  scene.add(path);
}

function addWetRockOutcrops(scene, terrainData) {
  const random = mulberry32(SEED + 911);
  const geometry = new THREE.DodecahedronGeometry(1, 0);
  const matrices = [];
  const dummy = new THREE.Object3D();
  const targetCount = 79;
  const elevationSpan = Math.max(terrainData.maxElevation - terrainData.minElevation, 1);
  let attempts = 0;

  while (matrices.length < targetCount && attempts < targetCount * 34) {
    attempts += 1;

    const z = randomRange(random, -HALF_TERRAIN + 20, HALF_TERRAIN - 20);
    const valleyCenter = riverAxisAt(z);
    const valleyBiased = random() < 0.82;
    const valleyBand = random() < 0.74 ? randomRange(random, -155, 155) : randomRange(random, -270, 270);
    const x = valleyBiased
      ? valleyCenter + valleyBand
      : randomRange(random, -HALF_TERRAIN + 24, HALF_TERRAIN - 24);
    const slope = terrainSlopeAt(x, z);
    const across = Math.abs(x - valleyCenter);
    const elevation = terrainElevationMetersAt(x, z);
    const height01 = THREE.MathUtils.clamp((elevation - terrainData.minElevation) / elevationSpan, 0, 1);
    const bottomAffinity = Math.pow(1 - height01, 1.85);
    const valleyProximity = Math.exp(-Math.pow(across / 185, 2));
    const density =
      0.04 +
      bottomAffinity * 0.74 +
      valleyProximity * bottomAffinity * 0.26 -
      Math.max(0, slope - 0.52) * 0.08;

    if (random() > THREE.MathUtils.clamp(density, 0.03, 0.94)) continue;
    if (!valleyBiased && bottomAffinity < 0.38 && random() < 0.82) continue;

    const baseScale = randomRange(random, 0.42, 1.35) * (0.44 + bottomAffinity * 0.78);
    const valleyBoulderScale =
      Math.pow(bottomAffinity, 2.18) * valleyProximity * randomRange(random, 2.6, 7.8);
    const slopeChipScale = randomRange(random, 0.22, 1.0) * (1 - bottomAffinity) * THREE.MathUtils.clamp(slope, 0.25, 0.9);
    const scale = Math.max(0.28, baseScale + valleyBoulderScale + slopeChipScale) * 0.5;
    const longAxis = randomRange(random, 0.78, 2.15) * (1 + valleyProximity * bottomAffinity * 0.54);
    const heightAxis = randomRange(random, 0.18, 0.58) * (0.62 + bottomAffinity * 0.45);
    const depthAxis = randomRange(random, 0.58, 1.58) * (1 + slope * 0.26);

    dummy.position.set(x, renderHeightMetersAt(x, z) + scale * 0.18, z);
    dummy.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    dummy.scale.set(scale * longAxis, scale * heightAxis, scale * depthAxis);
    dummy.updateMatrix();
    matrices.push(dummy.matrix.clone());
  }

  const rocks = new THREE.InstancedMesh(geometry, MATERIALS.wetRock, matrices.length);
  rocks.name = "valley-floor boulders fading into small high-slope rock";
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  matrices.forEach((matrix, index) => rocks.setMatrixAt(index, matrix));
  scene.add(rocks);
}

function addRainforestTrees(scene, terrainData) {
  const random = mulberry32(SEED + 1304);
  const trunkGeometry = new THREE.CylinderGeometry(0.72, 1, 1, 7);
  const roundedCanopyGeometry = new THREE.IcosahedronGeometry(1, 1);
  const coarseCanopyGeometry = new THREE.DodecahedronGeometry(1, 0);
  const trunkMatrices = [];
  const roundedCanopyMatrices = [];
  const coarseCanopyMatrices = [];
  const lightCanopyMatrices = [];
  const roundedCanopyColors = [];
  const coarseCanopyColors = [];
  const lightCanopyColors = [];
  const dummy = new THREE.Object3D();
  const patchTreeMultiplier = 2;
  const targetCount = 880 * patchTreeMultiplier;
  const minTreeSpacing = 11.5;
  const elevationSpan = Math.max(terrainData.maxElevation - terrainData.minElevation, 1);
  const plantedPositions = [];
  const patchSpecs = [
    { z: -425, lateral: -190, radiusX: 68, radiusZ: 82, count: 58 },
    { z: -410, lateral: 160, radiusX: 62, radiusZ: 76, count: 54 },
    { z: -315, lateral: -250, radiusX: 76, radiusZ: 84, count: 64 },
    { z: -270, lateral: 135, radiusX: 70, radiusZ: 86, count: 62 },
    { z: -185, lateral: -95, radiusX: 78, radiusZ: 92, count: 70 },
    { z: -120, lateral: 245, radiusX: 66, radiusZ: 78, count: 56 },
    { z: -40, lateral: -245, radiusX: 72, radiusZ: 84, count: 62 },
    { z: 30, lateral: 150, radiusX: 82, radiusZ: 96, count: 72 },
    { z: 105, lateral: -135, radiusX: 84, radiusZ: 96, count: 74 },
    { z: 180, lateral: 270, radiusX: 68, radiusZ: 82, count: 58 },
    { z: 235, lateral: -250, radiusX: 68, radiusZ: 82, count: 58 },
    { z: 305, lateral: 92, radiusX: 78, radiusZ: 90, count: 66 },
    { z: 380, lateral: -120, radiusX: 66, radiusZ: 80, count: 56 },
    { z: 420, lateral: 245, radiusX: 78, radiusZ: 92, count: 70 },
  ];
  let planted = 0;

  for (const patch of patchSpecs) {
    const centerZ = patch.z;
    const centerX = riverAxisAt(centerZ) + patch.lateral;
    let plantedInPatch = 0;
    let attempts = 0;

    const patchTargetCount = patch.count * patchTreeMultiplier;

    while (planted < targetCount && plantedInPatch < patchTargetCount && attempts < patchTargetCount * 46) {
      attempts += 1;

      const radius = Math.sqrt(random());
      const angle = randomRange(random, 0, Math.PI * 2);
      const z = centerZ + Math.sin(angle) * patch.radiusZ * radius + randomRange(random, -10, 10);
      const x = centerX + Math.cos(angle) * patch.radiusX * radius + randomRange(random, -10, 10);

      if (Math.abs(x) > HALF_TERRAIN - 28 || Math.abs(z) > HALF_TERRAIN - 28) continue;

      const elevation = terrainElevationMetersAt(x, z);
      const slope = terrainSlopeAt(x, z);
      const across = Math.abs(x - riverAxisAt(z));
      const canopyNoise = fbm(x * 0.019 + 4, z * 0.019 - 6, 4);
      const height01 = THREE.MathUtils.clamp((elevation - terrainData.minElevation) / elevationSpan, 0, 1);
      const elevationFade = 1 - THREE.MathUtils.clamp(height01 * 0.48, 0, 0.48);
      const density = 0.48 + canopyNoise * 0.34 + elevationFade * 0.18;

      if (across < 42) continue;
      if (slope > 0.74) continue;
      if (height01 > 0.82 && random() < 0.58) continue;
      if (random() > density) continue;
      if (isNearExistingTree(x, z, plantedPositions, minTreeSpacing)) continue;

      plantBroadleafTree(
        dummy,
        random,
        x,
        z,
        elevation,
        trunkMatrices,
        roundedCanopyMatrices,
        coarseCanopyMatrices,
        lightCanopyMatrices,
        roundedCanopyColors,
        coarseCanopyColors,
        lightCanopyColors,
      );
      plantedPositions.push({ x, z });
      plantedInPatch += 1;
      planted += 1;
    }
  }

  const trunks = new THREE.InstancedMesh(trunkGeometry, MATERIALS.treeTrunk, trunkMatrices.length);
  trunks.name = "humid forest trunks";
  trunks.castShadow = true;
  trunks.receiveShadow = true;
  trunkMatrices.forEach((matrix, index) => trunks.setMatrixAt(index, matrix));
  scene.add(trunks);

  addTreeInstancedMesh(
    scene,
    roundedCanopyGeometry,
    MATERIALS.canopyDeep,
    roundedCanopyMatrices,
    "rounded broadleaf canopy lobes",
    roundedCanopyColors,
  );
  addTreeInstancedMesh(
    scene,
    coarseCanopyGeometry,
    MATERIALS.canopyDeep,
    coarseCanopyMatrices,
    "irregular broadleaf canopy lobes",
    coarseCanopyColors,
  );
  addTreeInstancedMesh(
    scene,
    roundedCanopyGeometry,
    MATERIALS.canopyLight,
    lightCanopyMatrices,
    "lighter wet canopy highlights",
    lightCanopyColors,
  );
}

function isNearExistingTree(x, z, positions, minDistance) {
  const minDistanceSquared = minDistance * minDistance;

  for (const position of positions) {
    const dx = x - position.x;
    const dz = z - position.z;
    if (dx * dx + dz * dz < minDistanceSquared) {
      return true;
    }
  }

  return false;
}

function plantBroadleafTree(
  dummy,
  random,
  x,
  z,
  elevation,
  trunkMatrices,
  roundedCanopyMatrices,
  coarseCanopyMatrices,
  lightCanopyMatrices,
  roundedCanopyColors,
  coarseCanopyColors,
  lightCanopyColors,
) {
  const ground = renderHeightMetersAt(x, z);
  const heightPenalty = THREE.MathUtils.clamp((elevation - 170) / 360, 0, 0.32);
  const totalHeight = randomRange(random, 7.2, 17.4) * (1 - heightPenalty);
  const trunkHeight = totalHeight * randomRange(random, 0.5, 0.62);
  const trunkRadius = randomRange(random, 0.24, 0.5);
  const yaw = randomRange(random, 0, Math.PI * 2);
  const leanX = randomRange(random, -0.055, 0.055);
  const leanZ = randomRange(random, -0.055, 0.055);

  setMatrix(dummy, x, ground + trunkHeight / 2, z, yaw, leanX, leanZ, trunkRadius, trunkHeight, trunkRadius);
  trunkMatrices.push(dummy.matrix.clone());

  const form = random();
  const lobeCount = form < 0.48 ? 2 : form < 0.9 ? 3 : 4;
  const spreadFactor = form < 0.48 ? randomRange(random, 0.36, 0.5) : form < 0.9 ? randomRange(random, 0.48, 0.64) : randomRange(random, 0.58, 0.72);
  const verticalFactor = form < 0.48 ? randomRange(random, 0.9, 1.08) : randomRange(random, 0.66, 0.86);
  const canopyRadius = totalHeight * randomRange(random, 0.135, 0.19) * 2.5;
  const canopyBaseY = ground + trunkHeight + canopyRadius * randomRange(random, 0.16, 0.32);
  const crownYaw = yaw + randomRange(random, -0.55, 0.55);

  for (let i = 0; i < lobeCount; i += 1) {
    const isCore = i === 0;
    const angle = crownYaw + (i / Math.max(lobeCount, 1)) * Math.PI * 2 + randomRange(random, -0.56, 0.56);
    const distance = isCore ? canopyRadius * randomRange(random, 0, 0.06) : canopyRadius * spreadFactor * randomRange(random, 0.32, 0.68);
    const lobeRadius = canopyRadius * (isCore ? randomRange(random, 0.88, 1.06) : randomRange(random, 0.5, 0.72));
    const lobeX = x + Math.cos(angle) * distance;
    const lobeZ = z + Math.sin(angle) * distance;
    const lobeY = canopyBaseY + canopyRadius * randomRange(random, -0.12, 0.24) + (isCore ? canopyRadius * 0.04 : 0);
    const scaleX = lobeRadius * spreadFactor * randomRange(random, 0.76, 1.08);
    const scaleY = lobeRadius * verticalFactor * randomRange(random, 0.68, 1.0);
    const scaleZ = lobeRadius * randomRange(random, 0.68, 1.08);
    const targetMatrices = isCore || random() < 0.58 ? roundedCanopyMatrices : coarseCanopyMatrices;
    const targetColors = targetMatrices === roundedCanopyMatrices ? roundedCanopyColors : coarseCanopyColors;

    setMatrix(
      dummy,
      lobeX,
      lobeY,
      lobeZ,
      angle + randomRange(random, -0.35, 0.35),
      leanX * 0.5 + randomRange(random, -0.05, 0.05),
      leanZ * 0.5 + randomRange(random, -0.05, 0.05),
      scaleX,
      scaleY,
      scaleZ,
    );
    targetMatrices.push(dummy.matrix.clone());
    targetColors.push(canopyBlobColor(random, elevation, false));
  }

  const highlightCount = random() < 0.82 ? 1 : 2;
  for (let i = 0; i < highlightCount; i += 1) {
    const glintAngle = crownYaw - 0.78 + randomRange(random, -0.52, 0.52);
    const glintDistance = canopyRadius * spreadFactor * randomRange(random, 0.2, 0.46);
    const glintRadius = canopyRadius * randomRange(random, 0.22, 0.36);

    setMatrix(
      dummy,
      x + Math.cos(glintAngle) * glintDistance,
      canopyBaseY + canopyRadius * randomRange(random, 0.08, 0.34),
      z + Math.sin(glintAngle) * glintDistance,
      glintAngle,
      leanX * 0.4,
      leanZ * 0.4,
      glintRadius * randomRange(random, 0.82, 1.38),
      glintRadius * randomRange(random, 0.48, 0.8),
      glintRadius * randomRange(random, 0.72, 1.2),
    );
    lightCanopyMatrices.push(dummy.matrix.clone());
    lightCanopyColors.push(canopyBlobColor(random, elevation, true));
  }
}

function canopyBlobColor(random, elevation, isHighlight) {
  const uplandFade = THREE.MathUtils.clamp((elevation - 110) / 260, 0, 0.16);
  const hue = randomRange(random, 0.275, 0.39);
  const saturation = isHighlight ? randomRange(random, 0.78, 1) : randomRange(random, 0.66, 0.96);
  const lightness = isHighlight ? randomRange(random, 0.58, 0.74) : randomRange(random, 0.42, 0.58);
  const boostedSaturation = (saturation - uplandFade * 0.28) * CANOPY_VIBRANCY_MULTIPLIER;
  const color = new THREE.Color();

  color.setHSL(hue, THREE.MathUtils.clamp(boostedSaturation, 0.54, 1), lightness);
  return color;
}

function addTreeInstancedMesh(scene, geometry, material, matrices, name, colors = []) {
  const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  matrices.forEach((matrix, index) => {
    mesh.setMatrixAt(index, matrix);
    if (colors[index]) {
      mesh.setColorAt(index, colors[index]);
    }
  });
  if (colors.length > 0) {
    mesh.instanceColor.needsUpdate = true;
  }
  scene.add(mesh);
}

function addFlowers(scene, terrainData) {
  const random = mulberry32(SEED + 2207);
  const flowerStemGeometry = new THREE.CylinderGeometry(0.011, 0.015, 1, 5);
  const flowerHeadGeometry = new THREE.IcosahedronGeometry(1, 0);
  const flowerStemMatrices = [];
  const whiteFlowerMatrices = [];
  const pinkFlowerMatrices = [];
  const yellowFlowerMatrices = [];
  const dummy = new THREE.Object3D();
  const elevationSpan = Math.max(terrainData.maxElevation - terrainData.minElevation, 1);

  for (let z = -HALF_TERRAIN + 34; z <= HALF_TERRAIN - 34; z += 18) {
    for (let x = -HALF_TERRAIN + 34; x <= HALF_TERRAIN - 34; x += 18) {
      const sampleX = x + randomRange(random, -7.5, 7.5);
      const sampleZ = z + randomRange(random, -7.5, 7.5);
      const elevation = terrainElevationMetersAt(sampleX, sampleZ);
      const slope = terrainSlopeAt(sampleX, sampleZ);
      const height01 = THREE.MathUtils.clamp((elevation - terrainData.minElevation) / elevationSpan, 0, 1);
      const wetMeadowNoise = fbm(sampleX * 0.014 + 51, sampleZ * 0.014 - 37, 4);
      const openGroundNoise = fbm(sampleX * 0.032 - 12, sampleZ * 0.032 + 29, 3);
      const density =
        0.4 +
        wetMeadowNoise * 0.38 +
        (1 - height01) * 0.16 -
        Math.max(0, slope - 0.32) * 0.55;

      if (slope > 0.58) continue;
      if (random() > THREE.MathUtils.clamp(density, 0.12, 0.88)) continue;

      const flowerChance = (wetMeadowNoise * 0.18 + openGroundNoise * 0.12) * (1 - height01 * 0.35);
      if (random() < flowerChance) {
        addFlowerCluster(
          dummy,
          random,
          sampleX,
          sampleZ,
          randomRange(random, 2, 5),
          flowerStemMatrices,
          whiteFlowerMatrices,
          pinkFlowerMatrices,
          yellowFlowerMatrices,
        );
      }
    }
  }

  addInstancedMesh(scene, flowerStemGeometry, MATERIALS.flowerStem, flowerStemMatrices, "small meadow flower stems");
  addInstancedMesh(scene, flowerHeadGeometry, MATERIALS.flowerWhite, whiteFlowerMatrices, "small white meadow flowers");
  addInstancedMesh(scene, flowerHeadGeometry, MATERIALS.flowerPink, pinkFlowerMatrices, "small pink meadow flowers");
  addInstancedMesh(scene, flowerHeadGeometry, MATERIALS.flowerYellow, yellowFlowerMatrices, "small yellow meadow flowers");
}

function addFlowerCluster(
  dummy,
  random,
  centerX,
  centerZ,
  count,
  stemMatrices,
  whiteFlowerMatrices,
  pinkFlowerMatrices,
  yellowFlowerMatrices,
) {
  for (let index = 0; index < count; index += 1) {
    const angle = randomRange(random, 0, Math.PI * 2);
    const radius = Math.sqrt(random()) * randomRange(random, 0.45, 2.6);
    const x = centerX + Math.cos(angle) * radius;
    const z = centerZ + Math.sin(angle) * radius;
    const ground = renderHeightMetersAt(x, z);
    const stemHeight = randomRange(random, 0.18, 0.48);
    const yaw = randomRange(random, 0, Math.PI * 2);
    const leanX = randomRange(random, -0.08, 0.08);
    const leanZ = randomRange(random, -0.08, 0.08);

    setMatrix(dummy, x, ground + stemHeight / 2 + 0.018, z, yaw, leanX, leanZ, 1, stemHeight, 1);
    stemMatrices.push(dummy.matrix.clone());

    const flowerMatrices = random() < 0.46 ? whiteFlowerMatrices : random() < 0.68 ? yellowFlowerMatrices : pinkFlowerMatrices;
    const flowerScale = randomRange(random, 0.045, 0.095);
    setMatrix(
      dummy,
      x + leanX * stemHeight * 0.6,
      ground + stemHeight + 0.035,
      z + leanZ * stemHeight * 0.6,
      yaw,
      leanX,
      leanZ,
      flowerScale,
      flowerScale * randomRange(random, 0.58, 0.86),
      flowerScale,
    );
    flowerMatrices.push(dummy.matrix.clone());
  }
}

function addInstancedMesh(scene, geometry, material, matrices, name) {
  if (matrices.length === 0) {
    return;
  }

  const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
  scene.add(mesh);
}

function setMatrix(dummy, x, y, z, yaw, leanX, leanZ, scaleX, scaleY, scaleZ) {
  dummy.position.set(x, y, z);
  dummy.rotation.set(leanX, yaw, leanZ);
  dummy.scale.set(scaleX, scaleY, scaleZ);
  dummy.updateMatrix();
}

function addFogBoundaryPlane(scene) {
  const geometry = new THREE.PlaneGeometry(6000, 6000, 1, 1);
  const material = new THREE.MeshBasicMaterial({
    color: FOG_COLOR,
    fog: true,
  });
  const plane = new THREE.Mesh(geometry, material);
  plane.name = "low-detail fog boundary outside 1 km terrain";
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -92;
  scene.add(plane);
}

function addScaleReference(scene) {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  appendTerrainEdgeSegments(positions, -500, -500, 500, -500, 56);
  appendTerrainEdgeSegments(positions, -500, -500, -500, 500, 56);
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const line = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({
      color: 0x789088,
      transparent: true,
      opacity: 0.62,
      fog: true,
    }),
  );
  line.name = "1 km terrain boundary corner reference";
  scene.add(line);
}

function appendTerrainEdgeSegments(positions, startX, startZ, endX, endZ, segments) {
  let previous = null;

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const point = [
      THREE.MathUtils.lerp(startX, endX, t),
      0,
      THREE.MathUtils.lerp(startZ, endZ, t),
    ];
    point[1] = renderHeightMetersAt(point[0], point[2]) + 2.4;

    if (previous) {
      positions.push(previous[0], previous[1], previous[2], point[0], point[1], point[2]);
    }

    previous = point;
  }
}

function applyRadialFogToScene(scene) {
  const materials = new Set();

  scene.traverse((object) => {
    if (!object.material) return;

    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of objectMaterials) {
      materials.add(material);
    }
  });

  for (const material of materials) {
    applyRadialFogToMaterial(material);
  }
}

function applyRadialFogToMaterial(material) {
  if (!material || material.isShaderMaterial || material.userData.radialFogApplied) {
    return;
  }

  const previousOnBeforeCompile = material.onBeforeCompile;
  material.fog = true;
  material.userData.radialFogApplied = true;
  material.onBeforeCompile = (shader, renderer) => {
    if (previousOnBeforeCompile) {
      previousOnBeforeCompile(shader, renderer);
    }

    shader.uniforms.radialFogColor = { value: new THREE.Color(FOG_COLOR).convertLinearToSRGB() };
    shader.uniforms.radialFogInnerRadius = { value: RADIAL_FOG.innerRadiusMeters };
    shader.uniforms.radialFogOuterRadius = { value: RADIAL_FOG.outerRadiusMeters };
    shader.uniforms.radialFogInnerAlpha = { value: RADIAL_FOG.innerAlpha };
    shader.uniforms.radialFogOuterAlpha = { value: RADIAL_FOG.outerAlpha };
    shader.uniforms.radialFogEdgeFadeStart = { value: RADIAL_FOG.edgeFadeStartMeters };
    shader.uniforms.radialFogEdgeOpaque = { value: RADIAL_FOG.edgeOpaqueMeters };
    shader.uniforms.radialFogTerrainHalfSize = { value: HALF_TERRAIN };

    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `#include <common>
varying vec2 vRadialFogWorldXZ;`,
    );

    if (shader.vertexShader.includes("#include <worldpos_vertex>")) {
      shader.vertexShader = shader.vertexShader.replace(
        "#include <worldpos_vertex>",
        `#include <worldpos_vertex>
vRadialFogWorldXZ = worldPosition.xz;`,
      );
    } else {
      shader.vertexShader = shader.vertexShader.replace(
        "#include <project_vertex>",
        `vec4 radialFogWorldPosition = modelMatrix * vec4(transformed, 1.0);
vRadialFogWorldXZ = radialFogWorldPosition.xz;
#include <project_vertex>`,
      );
    }

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
uniform vec3 radialFogColor;
uniform float radialFogInnerRadius;
uniform float radialFogOuterRadius;
uniform float radialFogInnerAlpha;
uniform float radialFogOuterAlpha;
uniform float radialFogEdgeFadeStart;
uniform float radialFogEdgeOpaque;
uniform float radialFogTerrainHalfSize;
varying vec2 vRadialFogWorldXZ;`,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <fog_fragment>",
      `float radialFogEdgeDistance = max(abs(vRadialFogWorldXZ.x), abs(vRadialFogWorldXZ.y));
float radialFogDistance = radialFogEdgeDistance / radialFogTerrainHalfSize * radialFogOuterRadius;
float radialFogRamp = smoothstep(radialFogInnerRadius, radialFogOuterRadius, radialFogDistance);
float radialFogEdgeHide = smoothstep(radialFogEdgeFadeStart, radialFogEdgeOpaque, radialFogDistance);
float radialFogAmount = max(mix(radialFogInnerAlpha, radialFogOuterAlpha, radialFogRamp), radialFogEdgeHide);
gl_FragColor.rgb = mix(gl_FragColor.rgb, radialFogColor, radialFogAmount);`,
    );
  };

  material.needsUpdate = true;
}

function humidTerrainColorAt(x, z, elevation, slope) {
  const across = Math.abs(x - riverAxisAt(z));
  const normalizedElevation = THREE.MathUtils.clamp((elevation + 64) / 400, 0, 1);
  const moisture = THREE.MathUtils.clamp(1 - across / 280, 0, 1);
  const canopyNoise = fbm(x * 0.017 - 12, z * 0.017 + 7, 5);
  const scarNoise = fbm(x * 0.036 + 18, z * 0.036 - 22, 3);
  const base = new THREE.Color(0x448853);
  const wetLowland = new THREE.Color(0x2b6f47);
  const upperForest = new THREE.Color(0x6d9a50);
  const fernHighlight = new THREE.Color(0x8fb862);
  const clayScar = new THREE.Color(0x6b8457);
  const wetStone = new THREE.Color(0x53685c);
  const riverMoss = new THREE.Color(0x2b7051);

  base.lerp(wetLowland, moisture * 0.22);
  base.lerp(upperForest, normalizedElevation * 0.28 + canopyNoise * 0.12);

  if (canopyNoise > 0.62) {
    base.lerp(fernHighlight, 0.16);
  }

  base.lerp(riverMoss, Math.exp(-Math.pow(across / 58, 2)) * 0.18);
  base.lerp(wetStone, THREE.MathUtils.clamp(slope * 0.12, 0, 0.14));

  if (slope > 0.48 && scarNoise > 0.6) {
    base.lerp(clayScar, THREE.MathUtils.clamp((slope - 0.44) * 1.2, 0.1, 0.32));
  }

  return base;
}

function terrainSlopeAt(x, z) {
  const sample = 4.5;
  const dx = terrainElevationMetersAt(x + sample, z) - terrainElevationMetersAt(x - sample, z);
  const dz = terrainElevationMetersAt(x, z + sample) - terrainElevationMetersAt(x, z - sample);
  return Math.sqrt(dx * dx + dz * dz) / (sample * 2);
}

function createRibbonGeometry(points, width, yOffset = 0.25) {
  const positions = [];
  const indices = [];
  const halfWidth = width / 2;

  for (let i = 0; i < points.length; i += 1) {
    const previous = points[Math.max(0, i - 1)];
    const current = points[i];
    const next = points[Math.min(points.length - 1, i + 1)];
    const tangent = next.clone().sub(previous).normalize();
    const normal = new THREE.Vector2(-tangent.y, tangent.x);

    const left = current.clone().addScaledVector(normal, halfWidth);
    const right = current.clone().addScaledVector(normal, -halfWidth);
    positions.push(left.x, renderHeightMetersAt(left.x, left.y) + yOffset, left.y);
    positions.push(right.x, renderHeightMetersAt(right.x, right.y) + yOffset, right.y);

    if (i < points.length - 1) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function gully(across, along, alongCenter, alongScale) {
  return (
    Math.exp(-Math.pow(across / 40, 2)) *
    Math.exp(-Math.pow((along - alongCenter) / alongScale, 2))
  );
}

function smoothRamp(value, exponent = 1) {
  const clamped = THREE.MathUtils.clamp(value, 0, 1.4);
  return Math.pow(clamped, exponent);
}

function rotateAndTranslate(localX, localZ, centerX, centerZ, rotation) {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  return {
    x: centerX + localX * cos - localZ * sin,
    z: centerZ + localX * sin + localZ * cos,
  };
}

function fbm(x, z, octaves) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let normalization = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    value += amplitude * valueNoise(x * frequency, z * frequency);
    normalization += amplitude;
    amplitude *= 0.53;
    frequency *= 2.02;
  }

  return value / normalization;
}

function valueNoise(x, z) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = smoothstep(x - ix);
  const fz = smoothstep(z - iz);

  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);

  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(a, b, fx),
    THREE.MathUtils.lerp(c, d, fx),
    fz,
  );
}

function hash2(x, z) {
  const value = Math.sin(x * 127.1 + z * 311.7 + SEED * 0.017) * 43758.5453123;
  return value - Math.floor(value);
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return function random() {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function randomRange(random, min, max) {
  return min + (max - min) * random();
}
