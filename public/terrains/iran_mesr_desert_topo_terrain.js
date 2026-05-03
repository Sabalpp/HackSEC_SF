import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export const IRAN_MESR_DESERT_TOPO_CONFIG = Object.freeze({
  name: "Iran Mesr Desert Sand Dune Terrain",
  center: {
    latitude: 34.071,
    longitude: 54.782,
  },
  location: "Mesr Desert dune field, Dasht-e Kavir, Isfahan Province, Iran",
  centerElevationMetersAsl: 720,
  terrainSizeMeters: 1000,
  verticalExaggeration: 0.75,
  contourIntervalMeters: 25,
  note:
    "Procedural public terrain model inspired by the Mesr Desert dune field in Dasht-e Kavir. It is not a surveyed DEM tile.",
});

const CONFIG = IRAN_MESR_DESERT_TOPO_CONFIG;
const TERRAIN_SIZE = CONFIG.terrainSizeMeters;
const HALF_TERRAIN = TERRAIN_SIZE / 2;
const GRID_SEGMENTS = 220;
const VERTICAL_EXAGGERATION = CONFIG.verticalExaggeration;
const SEED = 30648057;
const FOG_COLOR = 0xd8cdb9;
const RADIAL_FOG = Object.freeze({
  innerRadiusMeters: 500,
  outerRadiusMeters: 1000,
  innerAlpha: 0.5,
  outerAlpha: 1,
  edgeFadeStartMeters: 560,
  edgeOpaqueMeters: 760,
});

const MATERIALS = {
  rock: new THREE.MeshStandardMaterial({
    color: 0x756854,
    roughness: 0.96,
    metalness: 0.02,
  }),
  contourMinor: new THREE.LineBasicMaterial({
    color: 0x8e7058,
    transparent: true,
    opacity: 0.42,
    fog: true,
  }),
  contourMajor: new THREE.LineBasicMaterial({
    color: 0x5d4637,
    transparent: true,
    opacity: 0.7,
    fog: true,
  }),
  washFloor: new THREE.MeshStandardMaterial({
    color: 0xcfa873,
    roughness: 0.96,
    metalness: 0,
  }),
  duneCrest: new THREE.LineBasicMaterial({
    color: 0xf7d99b,
    transparent: true,
    opacity: 0.42,
    fog: true,
  }),
  dryShrub: new THREE.MeshStandardMaterial({
    color: 0x776542,
    roughness: 0.98,
    metalness: 0,
  }),
  cactusPad: new THREE.MeshStandardMaterial({
    color: 0x4f7f49,
    roughness: 0.9,
    metalness: 0,
  }),
  cactusAreole: new THREE.MeshStandardMaterial({
    color: 0xf1dfbb,
    roughness: 0.86,
    metalness: 0,
  }),
};

export function createIranMesrDesertTopoScene(container = document.body, options = {}) {
  const target = typeof container === "string" ? document.querySelector(container) : container;

  if (!target) {
    throw new Error("Three.js terrain container was not found.");
  }

  const scene = new THREE.Scene();
  scene.name = CONFIG.name;
  scene.background = new THREE.Color(FOG_COLOR);
  scene.fog = new THREE.Fog(FOG_COLOR, 540, 1180);

  const camera = new THREE.PerspectiveCamera(54, 1, 1, 2400);
  camera.position.set(385, 235, 500);

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
  controls.target.set(0, 10, 0);
  controls.enableDamping = true;
  controls.maxDistance = 1050;
  controls.minDistance = 25;
  controls.maxPolarAngle = THREE.MathUtils.degToRad(87);
  controls.update();

  addLighting(scene);

  const terrainData = buildTerrainData();
  addTerrain(scene, terrainData);
  addRockOutcrops(scene);
  addSparseDesertShrubs(scene);
  addPricklyPearCacti(scene);
  addFogBoundaryPlane(scene);
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

  controls.update();
  renderer.render(scene, camera);

  renderer.setAnimationLoop(() => {
    controls.update();
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

export function terrainElevationMetersAt(xMetersEast, zMetersNorth) {
  const { u, v } = desertFrame(xMetersEast, zMetersNorth);
  const phase = dunePhaseAt(u, v);
  const duneEnvelope = duneFieldEnvelopeAt(u, v);
  const primaryWave = Math.sin(phase);
  const secondaryWave = Math.sin(phase * 0.58 + v * 0.004 + 1.35);
  const crossRipple = Math.sin(u * 0.014 - v * 0.018 + 0.8);
  const valleyScore = duneValleyScoreAt(xMetersEast, zMetersNorth);

  const basinTilt = 0.0018 * zMetersNorth - 0.0008 * xMetersEast;
  const rollingDunes =
    duneEnvelope *
    (3.8 * primaryWave +
      1.7 * secondaryWave +
      0.75 * crossRipple +
      1.1 * Math.pow(Math.max(0, primaryWave), 2.1));
  const interduneSwales = -1.6 * valleyScore;
  const broadSandSheet =
    1.45 * Math.sin((u + 180) * 0.006) * Math.exp(-Math.pow(v / 730, 2)) +
    1.05 * fbm(xMetersEast * 0.004 + 12, zMetersNorth * 0.004 - 3, 4);
  const softDryWashes =
    -0.9 * desertWash(u + 165 + 18 * Math.sin(v * 0.008), v, -160, 450) +
    -0.65 * desertWash(u - 215 + 14 * Math.cos(v * 0.009), v, 160, 390);
  const fineSandTexture =
    0.26 * fbm(xMetersEast * 0.019 + 19, zMetersNorth * 0.019 - 7, 4) +
    0.14 * fbm(u * 0.046 - 4, v * 0.046 + 23, 3);

  return basinTilt + rollingDunes + interduneSwales + broadSandSheet + softDryWashes + fineSandTexture - 3.2;
}

export function renderHeightMetersAt(xMetersEast, zMetersNorth) {
  return terrainElevationMetersAt(xMetersEast, zMetersNorth) * VERTICAL_EXAGGERATION;
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

function desertFrame(xMetersEast, zMetersNorth) {
  const angle = THREE.MathUtils.degToRad(-18);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    u: xMetersEast * cos - zMetersNorth * sin,
    v: xMetersEast * sin + zMetersNorth * cos,
  };
}

function fromDesertFrame(u, v) {
  const angle = THREE.MathUtils.degToRad(-18);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    x: u * cos + v * sin,
    z: -u * sin + v * cos,
  };
}

function dunePhaseAt(u, v) {
  const windWander = 34 * fbm(v * 0.0035 + 9, u * 0.002 - 13, 4);
  return (u + windWander) * 0.027 + v * 0.0055;
}

function duneFieldEnvelopeAt(u, v) {
  return Math.exp(-Math.pow(u / 610, 2)) * Math.exp(-Math.pow(v / 780, 2));
}

function duneValleyScoreAt(xMetersEast, zMetersNorth) {
  const { u, v } = desertFrame(xMetersEast, zMetersNorth);
  const phase = dunePhaseAt(u, v);
  const swale = Math.max(0, -Math.sin(phase));
  return Math.pow(swale, 2.4) * duneFieldEnvelopeAt(u, v);
}

function addLighting(scene) {
  const hemisphere = new THREE.HemisphereLight(0xfff0d8, 0x8a6f52, 1.72);
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight(0xffd18e, 2.95);
  sun.position.set(-520, 780, 220);
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
      const color = desertColorAt(x, z, elevation, slope);

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
    roughness: 0.98,
    metalness: 0,
  });

  const terrain = new THREE.Mesh(geometry, material);
  terrain.name = "1 km square Iranian desert topographic terrain";
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

function addDryWashChannels(scene) {
  const channels = [
    { offset: -132, width: 27, yOffset: 0.58, material: MATERIALS.washFloor },
    { offset: 214, width: 21, yOffset: 0.54, material: MATERIALS.washFloor },
    { offset: 32, width: 15, yOffset: 0.5, material: MATERIALS.washFloor },
  ];

  for (const channel of channels) {
    const points = [];

    for (let i = 0; i <= 34; i += 1) {
      const v = THREE.MathUtils.lerp(-520, 520, i / 34);
      const u = channel.offset + 18 * Math.sin(v * 0.013 + channel.offset * 0.02);
      const world = fromDesertFrame(u, v);
      points.push(new THREE.Vector2(world.x, world.z));
    }

    const trace = new THREE.Mesh(createRibbonGeometry(points, channel.width, channel.yOffset), channel.material);
    trace.name = "dry ephemeral wash channel";
    trace.receiveShadow = true;
    scene.add(trace);
  }
}

function addDuneCrestLines(scene) {
  const segments = [];

  for (let ridge = -4; ridge <= 5; ridge += 1) {
    let previous = null;

    for (let i = 0; i <= 48; i += 1) {
      const v = THREE.MathUtils.lerp(-420, 520, i / 48);
      const u = 40 + ridge * 112 + 18 * Math.sin(v * 0.009 + ridge * 0.6);
      const world = fromDesertFrame(u, v);

      if (Math.abs(world.x) > HALF_TERRAIN - 30 || Math.abs(world.z) > HALF_TERRAIN - 30) {
        previous = null;
        continue;
      }

      const current = {
        x: world.x,
        y: renderHeightMetersAt(world.x, world.z) + 1.65,
        z: world.z,
      };

      if (previous) {
        segments.push(previous.x, previous.y, previous.z, current.x, current.y, current.z);
      }

      previous = current;
    }
  }

  const crests = createLineSegments(segments, MATERIALS.duneCrest, "wind-formed dune crest lines");
  scene.add(crests);
}

function addRockOutcrops(scene) {
  const random = mulberry32(SEED + 910);
  const geometry = new THREE.CylinderGeometry(1, 1, 1, 8);
  const matrices = [];
  const dummy = new THREE.Object3D();
  const targetCount = 16;
  let attempts = 0;

  while (matrices.length < targetCount && attempts < targetCount * 120) {
    attempts += 1;

    const x = randomRange(random, -HALF_TERRAIN + 24, HALF_TERRAIN - 24);
    const z = randomRange(random, -HALF_TERRAIN + 24, HALF_TERRAIN - 24);
    const valleyScore = duneValleyScoreAt(x, z);

    if (valleyScore < 0.62) continue;

    const slope = terrainSlopeAt(x, z);

    if (slope > 0.11) continue;
    if (fbm(x * 0.018 + 5, z * 0.018 - 11, 3) < 0.48) continue;

    const y = renderHeightMetersAt(x, z);
    const longAxis = randomRange(random, 2.6, 7.2);
    const heightAxis = randomRange(random, 0.08, 0.22);
    const depthAxis = randomRange(random, 1.2, 3.8);

    dummy.position.set(x, y + heightAxis / 2 + 0.08, z);
    dummy.rotation.set(randomRange(random, -0.045, 0.045), randomRange(random, 0, Math.PI * 2), randomRange(random, -0.045, 0.045));
    dummy.scale.set(longAxis, heightAxis, depthAxis);
    dummy.updateMatrix();
    matrices.push(dummy.matrix.clone());
  }

  const rocks = new THREE.InstancedMesh(geometry, MATERIALS.rock, matrices.length);
  rocks.name = "sparse flat stones in interdune valley bottoms";
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  matrices.forEach((matrix, index) => rocks.setMatrixAt(index, matrix));
  scene.add(rocks);
}

function addSparseDesertShrubs(scene) {
  const random = mulberry32(SEED + 1204);
  const tuftGeometry = new THREE.ConeGeometry(1, 1, 7);
  const matrices = [];
  const dummy = new THREE.Object3D();
  const targetCount = 38;
  let attempts = 0;

  while (matrices.length < targetCount && attempts < targetCount * 22) {
    attempts += 1;

    const x = randomRange(random, -HALF_TERRAIN + 34, HALF_TERRAIN - 34);
    const z = randomRange(random, -HALF_TERRAIN + 34, HALF_TERRAIN - 34);
    const { u, v } = desertFrame(x, z);
    const slope = terrainSlopeAt(x, z);
    const valleyScore = duneValleyScoreAt(x, z);
    const washBias =
      Math.exp(-Math.pow((u + 165) / 70, 2)) +
      Math.exp(-Math.pow((u - 215) / 66, 2));
    const survivalNoise = fbm(x * 0.018 + 31, z * 0.018 - 18, 4);

    if (slope > 0.22) continue;
    if (valleyScore < 0.16 && washBias < 0.22) continue;
    if (survivalNoise < 0.52) continue;

    const ground = renderHeightMetersAt(x, z);
    const height = randomRange(random, 0.35, 1.05);
    const radius = randomRange(random, 0.34, 0.95);

    setMatrix(
      dummy,
      x,
      ground + height / 2 + 0.1,
      z,
      randomRange(random, 0, Math.PI * 2),
      randomRange(random, -0.12, 0.12),
      randomRange(random, -0.12, 0.12),
      radius,
      height,
      radius,
    );
    matrices.push(dummy.matrix.clone());
  }

  const shrubs = new THREE.InstancedMesh(tuftGeometry, MATERIALS.dryShrub, matrices.length);
  shrubs.name = "sparse desert shrub tufts";
  shrubs.castShadow = true;
  shrubs.receiveShadow = true;
  matrices.forEach((matrix, index) => shrubs.setMatrixAt(index, matrix));
  scene.add(shrubs);
}

function addPricklyPearCacti(scene) {
  const random = mulberry32(SEED + 2026);
  const padGeometry = new THREE.SphereGeometry(1, 14, 10);
  const areoleGeometry = new THREE.SphereGeometry(1, 5, 4);
  const padMatrices = [];
  const areoleMatrices = [];
  const dummy = new THREE.Object3D();
  const targetCount = 46;
  let attempts = 0;

  while (padMatrices.length < targetCount * 3 && attempts < targetCount * 32) {
    attempts += 1;

    const x = randomRange(random, -HALF_TERRAIN + 42, HALF_TERRAIN - 42);
    const z = randomRange(random, -HALF_TERRAIN + 42, HALF_TERRAIN - 42);
    const slope = terrainSlopeAt(x, z);
    const valleyScore = duneValleyScoreAt(x, z);
    const survivalNoise = fbm(x * 0.011 - 21, z * 0.011 + 8, 4);

    if (slope > 0.24) continue;
    if (survivalNoise < 0.24 && valleyScore < 0.28) continue;

    const ground = renderHeightMetersAt(x, z);
    const yaw = randomRange(random, 0, Math.PI * 2);
    const size = randomRange(random, 0.55, 0.9);

    plantPricklyPearCactus(dummy, random, x, ground, z, yaw, size, padMatrices, areoleMatrices);
  }

  const pads = new THREE.InstancedMesh(padGeometry, MATERIALS.cactusPad, padMatrices.length);
  pads.name = "prickly pear cactus oval pads";
  pads.castShadow = true;
  pads.receiveShadow = true;
  padMatrices.forEach((matrix, index) => pads.setMatrixAt(index, matrix));
  scene.add(pads);

  const areoles = new THREE.InstancedMesh(areoleGeometry, MATERIALS.cactusAreole, areoleMatrices.length);
  areoles.name = "pale prickly pear areoles";
  areoles.castShadow = true;
  areoleMatrices.forEach((matrix, index) => areoles.setMatrixAt(index, matrix));
  scene.add(areoles);
}

function plantPricklyPearCactus(dummy, random, x, ground, z, yaw, size, padMatrices, areoleMatrices) {
  const baseHeight = randomRange(random, 0.9, 1.65) * size;
  const baseWidth = baseHeight * randomRange(random, 0.38, 0.52);
  const baseThickness = randomRange(random, 0.1, 0.18) * size;
  const padPlan = [
    {
      offsetX: 0,
      offsetY: baseHeight * 0.52,
      offsetZ: 0,
      width: baseWidth,
      height: baseHeight,
      thickness: baseThickness,
      tiltX: randomRange(random, -0.08, 0.08),
      tiltZ: randomRange(random, -0.1, 0.1),
    },
  ];

  const sideCount = 1 + Math.floor(random() * 2);
  for (let i = 0; i < sideCount; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const height = baseHeight * randomRange(random, 0.54, 0.78);
    const width = height * randomRange(random, 0.4, 0.55);
    padPlan.push({
      offsetX: side * baseWidth * randomRange(random, 0.42, 0.64),
      offsetY: baseHeight * randomRange(random, 0.76, 1.02),
      offsetZ: randomRange(random, -0.26, 0.26) * size,
      width,
      height,
      thickness: baseThickness * randomRange(random, 0.78, 1.08),
      tiltX: randomRange(random, -0.18, 0.16),
      tiltZ: side * randomRange(random, 0.22, 0.46),
    });
  }

  for (const pad of padPlan) {
    addCactusPadMatrix(dummy, padMatrices, x, ground, z, yaw, pad);
    addCactusAreoleMatrices(dummy, random, areoleMatrices, x, ground, z, yaw, pad);
  }
}

function addCactusPadMatrix(dummy, matrices, x, ground, z, yaw, pad) {
  const world = offsetInYawFrame(x, z, yaw, pad.offsetX, pad.offsetZ);
  dummy.position.set(world.x, ground + pad.offsetY, world.z);
  dummy.rotation.set(pad.tiltX, yaw, pad.tiltZ);
  dummy.scale.set(pad.width / 2, pad.height / 2, pad.thickness);
  dummy.updateMatrix();
  matrices.push(dummy.matrix.clone());
}

function addCactusAreoleMatrices(dummy, random, matrices, x, ground, z, yaw, pad) {
  const dotCount = 5;

  for (let i = 0; i < dotCount; i += 1) {
    const localX = randomRange(random, -0.42, 0.42) * pad.width;
    const localY = randomRange(random, -0.34, 0.36) * pad.height;
    const localZ = pad.thickness * 1.04;

    if (Math.pow(localX / (pad.width / 2), 2) + Math.pow(localY / (pad.height / 2), 2) > 0.74) {
      continue;
    }

    const world = offsetInYawFrame(x, z, yaw, pad.offsetX + localX, pad.offsetZ + localZ);
    const radius = randomRange(random, 0.035, 0.065);
    dummy.position.set(world.x, ground + pad.offsetY + localY, world.z);
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.set(radius, radius, radius);
    dummy.updateMatrix();
    matrices.push(dummy.matrix.clone());
  }
}

function offsetInYawFrame(originX, originZ, yaw, localX, localZ) {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);

  return {
    x: originX + localX * cos - localZ * sin,
    z: originZ + localX * sin + localZ * cos,
  };
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
  plane.position.y = -24;
  scene.add(plane);
}

function addScaleReference(scene) {
  const geometry = new THREE.BufferGeometry();
  const y = renderHeightMetersAt(-500, -500) + 3;
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([-500, y, -500, 500, y, -500, -500, y, 500, -500, y, -500], 3),
  );
  const line = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({
      color: 0x8c979a,
      transparent: true,
      opacity: 0.65,
      fog: true,
    }),
  );
  line.name = "1 km terrain boundary corner reference";
  scene.add(line);
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

function desertColorAt(x, z, elevation, slope) {
  const normalizedElevation = THREE.MathUtils.clamp((elevation + 38) / 76, 0, 1);
  const valleyScore = duneValleyScoreAt(x, z);
  const windNoise = fbm(x * 0.018 - 7, z * 0.018 + 13, 4);
  const fineNoise = fbm(x * 0.043 + 22, z * 0.043 - 4, 4);

  const base = new THREE.Color(0xdcae6c);
  const duneGold = new THREE.Color(0xf2cc82);
  const crestSand = new THREE.Color(0xefbd70);
  const interduneFlat = new THREE.Color(0xd6be96);
  const slopeShadow = new THREE.Color(0xa88661);

  base.lerp(duneGold, THREE.MathUtils.clamp((windNoise - 0.18) * 0.35, 0, 0.24));
  base.lerp(crestSand, normalizedElevation * 0.22);
  base.lerp(interduneFlat, THREE.MathUtils.clamp(valleyScore * 0.46, 0, 0.46));
  base.lerp(slopeShadow, THREE.MathUtils.clamp(slope * 0.36, 0, 0.24));
  base.offsetHSL(0, 0, (fineNoise - 0.5) * 0.035);

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

function desertWash(across, along, alongCenter, alongScale) {
  return (
    Math.exp(-Math.pow(across / 34, 2)) *
    Math.exp(-Math.pow((along - alongCenter) / alongScale, 2))
  );
}

function smoothRamp(value, exponent = 1) {
  const clamped = THREE.MathUtils.clamp(value, 0, 1.4);
  return Math.pow(clamped, exponent);
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
