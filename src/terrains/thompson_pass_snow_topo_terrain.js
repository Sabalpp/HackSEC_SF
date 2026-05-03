import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export const THOMPSON_PASS_SNOW_TOPO_CONFIG = Object.freeze({
  name: "Thompson Pass Snow Topographic Terrain",
  center: {
    latitude: 61.13130296,
    longitude: -145.7367325,
  },
  location: "Thompson Pass, Chugach Mountains, Near Valdez, Alaska",
  centerElevationMetersAsl: 855,
  terrainSizeMeters: 1000,
  verticalExaggeration: 1,
  contourIntervalMeters: 25,
  note:
    "Procedural public terrain model inspired by Thompson Pass alpine topography. It is not a surveyed DEM tile.",
});

const CONFIG = THOMPSON_PASS_SNOW_TOPO_CONFIG;
const TERRAIN_SIZE = CONFIG.terrainSizeMeters;
const HALF_TERRAIN = TERRAIN_SIZE / 2;
const GRID_SEGMENTS = 220;
const VERTICAL_EXAGGERATION = CONFIG.verticalExaggeration;
const SEED = 61131302;
const SKY_COLOR = 0xd7eefb;
const FOG_COLOR = SKY_COLOR;
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
  minOrbitDistanceMeters: 78,
  maxPolarAngleDegrees: 80,
  groundClearanceMeters: 24,
  targetGroundClearanceMeters: 8,
  targetEdgePaddingMeters: 18,
});

const MATERIALS = {
  rock: new THREE.MeshStandardMaterial({
    color: 0x5d6060,
    roughness: 0.92,
    metalness: 0.02,
  }),
  pineTrunk: new THREE.MeshStandardMaterial({
    color: 0x493d31,
    roughness: 0.94,
    metalness: 0,
  }),
  pineNeedles: new THREE.MeshStandardMaterial({
    color: 0x253d2f,
    roughness: 0.96,
    metalness: 0,
  }),
  pineSnow: new THREE.MeshStandardMaterial({
    color: 0xfbfffd,
    roughness: 0.88,
    metalness: 0,
  }),
  contourMinor: new THREE.LineBasicMaterial({
    color: 0x667377,
    transparent: true,
    opacity: 0.46,
    fog: true,
  }),
  contourMajor: new THREE.LineBasicMaterial({
    color: 0x34444a,
    transparent: true,
    opacity: 0.72,
    fog: true,
  }),
  snowRoad: new THREE.MeshStandardMaterial({
    color: 0xcbd5d8,
    roughness: 0.96,
    metalness: 0,
  }),
  slopeShadow: new THREE.MeshStandardMaterial({
    color: 0xb7c2c6,
    roughness: 0.98,
    metalness: 0,
  }),
};

export function createThompsonPassSnowTopoScene(container = document.body, options = {}) {
  const target = typeof container === "string" ? document.querySelector(container) : container;

  if (!target) {
    throw new Error("Three.js terrain container was not found.");
  }

  const scene = new THREE.Scene();
  scene.name = CONFIG.name;
  scene.background = new THREE.Color(SKY_COLOR);
  scene.fog = new THREE.Fog(FOG_COLOR, 540, 1180);

  const camera = new THREE.PerspectiveCamera(54, 1, CAMERA_COLLISION.nearPlaneMeters, 2400);
  camera.position.set(420, 310, 610);

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
  controls.target.set(0, 35, 0);
  controls.enableDamping = true;
  controls.maxDistance = 1050;
  controls.minDistance = CAMERA_COLLISION.minOrbitDistanceMeters;
  controls.maxPolarAngle = THREE.MathUtils.degToRad(CAMERA_COLLISION.maxPolarAngleDegrees);
  controls.update();

  addLighting(scene);

  const terrainData = buildTerrainData();
  addTerrain(scene, terrainData);
  addContourLines(scene, terrainData);
  addSnowCoveredPassTrace(scene);
  addWindPackedSnowfields(scene);
  addRockOutcrops(scene);
  addSnowToppedPineTrees(scene);
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
  const valleyAxis = valleyAxisAt(zMetersNorth);
  const across = xMetersEast - valleyAxis;
  const along = zMetersNorth;
  const normalizedAcross = Math.abs(across) / HALF_TERRAIN;
  const normalizedAlong = along / HALF_TERRAIN;

  const saddle = -34 * Math.exp(-Math.pow(along / 245, 2));
  const westWall = 152 * smoothRamp(Math.max(0, (-across - 75) / 430), 1.55);
  const eastWall = 196 * smoothRamp(Math.max(0, (across - 55) / 445), 1.72);
  const northRise = 46 * smoothRamp(Math.max(0, normalizedAlong), 1.28);
  const southRoll = 28 * smoothRamp(Math.max(0, -normalizedAlong), 1.18);
  const glacialBench = -24 * Math.exp(-Math.pow((across + 145) / 105, 2)) * Math.exp(-Math.pow((along - 120) / 420, 2));
  const windLip = 21 * Math.exp(-Math.pow((across - 215) / 58, 2)) * Math.exp(-Math.pow((along + 160) / 330, 2));

  const gullies =
    -18 * gully(across + 245 + 18 * Math.sin(along * 0.018), along, -160, 250) +
    -14 * gully(across - 285 + 16 * Math.cos(along * 0.016), along, 110, 300) +
    -10 * gully(across + 30, along, 220, 360);

  const ridgeRoughness =
    9.5 * fbm(xMetersEast * 0.011, zMetersNorth * 0.011, 5) * Math.min(1, normalizedAcross * 1.35) +
    4.2 * fbm(xMetersEast * 0.027 + 17, zMetersNorth * 0.027 - 9, 4);

  const passFloorUndulation =
    5.5 * Math.sin((along + 120) * 0.013) * Math.exp(-Math.pow(across / 250, 2)) +
    3.8 * Math.cos((xMetersEast - zMetersNorth) * 0.009);

  return (
    saddle +
    westWall +
    eastWall +
    northRise +
    southRoll +
    glacialBench +
    windLip +
    gullies +
    ridgeRoughness +
    passFloorUndulation -
    18
  );
}

export function renderHeightMetersAt(xMetersEast, zMetersNorth) {
  return terrainElevationMetersAt(xMetersEast, zMetersNorth) * VERTICAL_EXAGGERATION;
}

export function addThompsonPassSnowTopoWorld(scene, options = {}) {
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
  addSnowCoveredPassTrace(scene);
  addWindPackedSnowfields(scene);
  addRockOutcrops(scene);
  addSnowToppedPineTrees(scene);
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

function valleyAxisAt(zMetersNorth) {
  return 34 * Math.sin(zMetersNorth * 0.0075) - 18 * Math.sin(zMetersNorth * 0.017);
}

function addLighting(scene) {
  const hemisphere = new THREE.HemisphereLight(0xf4f8fb, 0x75818a, 1.65);
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight(0xfff5dc, 2.65);
  sun.position.set(-460, 740, 280);
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
      const color = snowColorAt(x, z, elevation, slope);

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
  terrain.name = "1 km square snow-blanketed topographic terrain";
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

function addSnowCoveredPassTrace(scene) {
  const points = [];

  for (let i = 0; i <= 30; i += 1) {
    const z = THREE.MathUtils.lerp(-520, 520, i / 30);
    const x = 22 * Math.sin(z * 0.009) - 16 * Math.sin(z * 0.018);
    points.push(new THREE.Vector2(x, z));
  }

  const trace = new THREE.Mesh(createRibbonGeometry(points, 32, 0.62), MATERIALS.snowRoad);
  trace.name = "subtle snow-covered pass trace";
  trace.receiveShadow = true;
  scene.add(trace);
}

function addWindPackedSnowfields(scene) {
  const snowfields = [
    { x: -190, z: -155, width: 210, depth: 72, rotation: -0.42, opacity: 0.58 },
    { x: 245, z: 170, width: 260, depth: 78, rotation: 0.32, opacity: 0.5 },
    { x: -55, z: 280, width: 180, depth: 56, rotation: -0.1, opacity: 0.44 },
    { x: 160, z: -330, width: 160, depth: 50, rotation: 0.16, opacity: 0.42 },
  ];

  for (const field of snowfields) {
    const mesh = createSnowfield(field);
    scene.add(mesh);
  }
}

function createSnowfield(field) {
  const xSegments = 14;
  const zSegments = 5;
  const positions = [];
  const indices = [];

  for (let zIndex = 0; zIndex <= zSegments; zIndex += 1) {
    const localZ = THREE.MathUtils.lerp(-field.depth / 2, field.depth / 2, zIndex / zSegments);

    for (let xIndex = 0; xIndex <= xSegments; xIndex += 1) {
      const localX = THREE.MathUtils.lerp(-field.width / 2, field.width / 2, xIndex / xSegments);
      const world = rotateAndTranslate(localX, localZ, field.x, field.z, field.rotation);
      positions.push(world.x, renderHeightMetersAt(world.x, world.z) + 0.85, world.z);
    }
  }

  for (let zIndex = 0; zIndex < zSegments; zIndex += 1) {
    for (let xIndex = 0; xIndex < xSegments; xIndex += 1) {
      const rowWidth = xSegments + 1;
      const a = zIndex * rowWidth + xIndex;
      const b = a + 1;
      const c = a + rowWidth;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0xf4f7f5,
    roughness: 0.92,
    metalness: 0,
    transparent: true,
    opacity: field.opacity,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "wind-packed snowfield overlay";
  mesh.receiveShadow = true;
  return mesh;
}

function addRockOutcrops(scene) {
  const random = mulberry32(SEED + 910);
  const geometry = new THREE.DodecahedronGeometry(1, 0);
  const matrices = [];
  const dummy = new THREE.Object3D();
  const targetCount = 118;
  let attempts = 0;

  while (matrices.length < targetCount && attempts < targetCount * 18) {
    attempts += 1;

    const valleyBiased = random() < 0.58;
    const z = randomRange(random, -HALF_TERRAIN + 22, HALF_TERRAIN - 22);
    const x = valleyBiased
      ? valleyAxisAt(z) + randomRange(random, -190, 190)
      : randomRange(random, -HALF_TERRAIN + 22, HALF_TERRAIN - 22);
    const slope = terrainSlopeAt(x, z);
    const elevation = terrainElevationMetersAt(x, z);
    const across = Math.abs(x - valleyAxisAt(z));
    const valleyProximity = Math.exp(-Math.pow(across / 165, 2));
    const relativeHeight = THREE.MathUtils.clamp((elevation + 45) / 235, 0, 1);

    if (!valleyBiased && slope < 0.22 && random() < 0.75) {
      continue;
    }

    if (across < 34 && random() < 0.58) {
      continue;
    }

    const y = renderHeightMetersAt(x, z);
    const valleyBoulderScale = randomRange(random, 3.2, 7.4) * valleyProximity * (1 - relativeHeight * 0.48);
    const highOutcropScale = randomRange(random, 0.45, 2.35) * (0.72 + slope * 1.1);
    const scale = Math.max(0.7, valleyBoulderScale + highOutcropScale * (0.42 + relativeHeight * 0.72));
    const longAxis = randomRange(random, 0.75, 1.85) * (1 + valleyProximity * 0.42);
    const heightAxis = randomRange(random, 0.18, 0.52) * (1 - valleyProximity * 0.16);
    const depthAxis = randomRange(random, 0.58, 1.5) * (1 + slope * 0.45);

    dummy.position.set(x, y + scale * 0.2, z);
    dummy.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    dummy.scale.set(scale * longAxis, scale * heightAxis, scale * depthAxis);
    dummy.updateMatrix();
    matrices.push(dummy.matrix.clone());
  }

  const rocks = new THREE.InstancedMesh(geometry, MATERIALS.rock, matrices.length);
  rocks.name = "wind-scoured rock outcrops";
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  matrices.forEach((matrix, index) => rocks.setMatrixAt(index, matrix));
  scene.add(rocks);
}

function addSnowToppedPineTrees(scene) {
  const random = mulberry32(SEED + 1204);
  const trunkGeometry = new THREE.CylinderGeometry(1, 1, 1, 6);
  const crownGeometry = new THREE.ConeGeometry(1, 1, 8);
  const trunkMatrices = [];
  const lowerNeedleMatrices = [];
  const middleNeedleMatrices = [];
  const upperNeedleMatrices = [];
  const lowerSnowMatrices = [];
  const middleSnowMatrices = [];
  const upperSnowMatrices = [];
  const dummy = new THREE.Object3D();
  const clusters = [
    { z: -410, lateral: -76, radiusX: 38, radiusZ: 58, count: 15 },
    { z: -350, lateral: 68, radiusX: 46, radiusZ: 66, count: 19 },
    { z: -275, lateral: -112, radiusX: 34, radiusZ: 50, count: 13 },
    { z: -210, lateral: 88, radiusX: 52, radiusZ: 70, count: 22 },
    { z: -118, lateral: -70, radiusX: 44, radiusZ: 64, count: 18 },
    { z: -36, lateral: 78, radiusX: 52, radiusZ: 76, count: 24 },
    { z: 60, lateral: -92, radiusX: 42, radiusZ: 62, count: 17 },
    { z: 144, lateral: 72, radiusX: 44, radiusZ: 60, count: 18 },
    { z: 238, lateral: -68, radiusX: 36, radiusZ: 56, count: 13 },
    { z: 330, lateral: 82, radiusX: 42, radiusZ: 58, count: 15 },
  ];

  for (const cluster of clusters) {
    let planted = 0;
    let attempts = 0;

    while (planted < cluster.count && attempts < cluster.count * 22) {
      attempts += 1;

      const radius = Math.sqrt(random());
      const angle = randomRange(random, 0, Math.PI * 2);
      const z = cluster.z + Math.sin(angle) * cluster.radiusZ * radius + randomRange(random, -8, 8);
      const x =
        valleyAxisAt(z) +
        cluster.lateral +
        Math.cos(angle) * cluster.radiusX * radius +
        randomRange(random, -7, 7);

      if (Math.abs(x) > HALF_TERRAIN - 28 || Math.abs(z) > HALF_TERRAIN - 28) continue;

      const elevation = terrainElevationMetersAt(x, z);
      const slope = terrainSlopeAt(x, z);
      const across = Math.abs(x - valleyAxisAt(z));
      const shelterNoise = fbm(x * 0.014 + 31, z * 0.014 - 18, 4);

      if (across < 34 || across > 168) continue;
      if (elevation > 52) continue;
      if (slope > 0.36) continue;
      if (shelterNoise < 0.2 && random() < 0.72) continue;

      plantSnowToppedPine(
        dummy,
        random,
        x,
        z,
        elevation,
        trunkMatrices,
        lowerNeedleMatrices,
        middleNeedleMatrices,
        upperNeedleMatrices,
        lowerSnowMatrices,
        middleSnowMatrices,
        upperSnowMatrices,
      );
      planted += 1;
    }
  }

  const trunks = new THREE.InstancedMesh(trunkGeometry, MATERIALS.pineTrunk, trunkMatrices.length);
  trunks.name = "snow-topped pine trunks";
  trunks.castShadow = true;
  trunks.receiveShadow = true;
  trunkMatrices.forEach((matrix, index) => trunks.setMatrixAt(index, matrix));
  scene.add(trunks);

  addTreeInstancedMesh(scene, crownGeometry, MATERIALS.pineNeedles, lowerNeedleMatrices, "lower green pine needles");
  addTreeInstancedMesh(scene, crownGeometry, MATERIALS.pineNeedles, middleNeedleMatrices, "middle green pine needles");
  addTreeInstancedMesh(scene, crownGeometry, MATERIALS.pineNeedles, upperNeedleMatrices, "upper green pine needles");
  addTreeInstancedMesh(scene, crownGeometry, MATERIALS.pineSnow, lowerSnowMatrices, "lower snow caps on pine branches");
  addTreeInstancedMesh(scene, crownGeometry, MATERIALS.pineSnow, middleSnowMatrices, "middle snow caps on pine branches");
  addTreeInstancedMesh(scene, crownGeometry, MATERIALS.pineSnow, upperSnowMatrices, "upper snow caps on pine branches");
}

function plantSnowToppedPine(
  dummy,
  random,
  x,
  z,
  elevation,
  trunkMatrices,
  lowerNeedleMatrices,
  middleNeedleMatrices,
  upperNeedleMatrices,
  lowerSnowMatrices,
  middleSnowMatrices,
  upperSnowMatrices,
) {
  const ground = renderHeightMetersAt(x, z);
  const heightPenalty = THREE.MathUtils.clamp((elevation - 12) / 95, 0, 0.36);
  const heightT = Math.pow(random(), 0.72);
  const totalHeight = THREE.MathUtils.lerp(5.4, 18.8, heightT) * (1 - heightPenalty);
  const crownSpread = randomRange(random, 0.78, 1.34) * (1 - heightPenalty * 0.18);
  const crownOvalX = randomRange(random, 0.78, 1.28);
  const crownOvalZ = randomRange(random, 0.76, 1.24);
  const layerJitter = totalHeight * randomRange(random, 0.008, 0.03);
  const trunkHeight = totalHeight * randomRange(random, 0.18, 0.34);
  const trunkRadius = THREE.MathUtils.clamp(totalHeight * randomRange(random, 0.032, 0.052), 0.24, 0.82);
  const trunkOval = randomRange(random, 0.82, 1.18);
  const yaw = randomRange(random, 0, Math.PI * 2);
  const leanDirection = randomRange(random, 0, Math.PI * 2);
  const leanMagnitude = randomRange(random, 0.01, 0.065) * (1 + heightPenalty * 0.5);
  const leanX = Math.cos(leanDirection) * leanMagnitude;
  const leanZ = Math.sin(leanDirection) * leanMagnitude;

  setMatrix(
    dummy,
    x,
    ground + trunkHeight / 2,
    z,
    yaw,
    leanX,
    leanZ,
    trunkRadius * trunkOval,
    trunkHeight,
    trunkRadius / trunkOval,
  );
  trunkMatrices.push(dummy.matrix.clone());

  const lowerRadius = totalHeight * randomRange(random, 0.135, 0.225) * crownSpread;
  const lowerRadiusX = lowerRadius * crownOvalX * randomRange(random, 0.88, 1.16);
  const lowerRadiusZ = lowerRadius * crownOvalZ * randomRange(random, 0.86, 1.18);
  const lowerSnowRadiusFactor = randomRange(random, 0.78, 0.94);

  const middleRadius = totalHeight * randomRange(random, 0.095, 0.165) * crownSpread;
  const middleRadiusX = Math.min(
    middleRadius * crownOvalX * randomRange(random, 0.82, 1.18),
    lowerRadiusX * randomRange(random, 0.48, 0.68),
    lowerRadiusX * lowerSnowRadiusFactor * randomRange(random, 0.76, 0.92),
  );
  const middleRadiusZ = Math.min(
    middleRadius * crownOvalZ * randomRange(random, 0.84, 1.18),
    lowerRadiusZ * randomRange(random, 0.48, 0.68),
    lowerRadiusZ * lowerSnowRadiusFactor * randomRange(random, 0.76, 0.92),
  );
  const middleSnowRadiusFactor = randomRange(random, 0.78, 0.94);

  const upperRadius = totalHeight * randomRange(random, 0.062, 0.125) * crownSpread;
  const upperRadiusX = Math.min(
    upperRadius * crownOvalX * randomRange(random, 0.76, 1.22),
    middleRadiusX * randomRange(random, 0.46, 0.68),
    middleRadiusX * middleSnowRadiusFactor * randomRange(random, 0.76, 0.92),
  );
  const upperRadiusZ = Math.min(
    upperRadius * crownOvalZ * randomRange(random, 0.78, 1.22),
    middleRadiusZ * randomRange(random, 0.46, 0.68),
    middleRadiusZ * middleSnowRadiusFactor * randomRange(random, 0.76, 0.92),
  );

  const layers = [
    {
      bottom: ground + trunkHeight * randomRange(random, 0.3, 0.56),
      height: totalHeight * randomRange(random, 0.43, 0.58),
      radiusX: lowerRadiusX,
      radiusZ: lowerRadiusZ,
      snowHeight: totalHeight * randomRange(random, 0.13, 0.25),
      snowRadiusFactor: lowerSnowRadiusFactor,
      yawOffset: randomRange(random, -0.28, 0.28),
      offsetX: randomRange(random, -layerJitter, layerJitter),
      offsetZ: randomRange(random, -layerJitter, layerJitter),
    },
    {
      bottom: ground + trunkHeight + totalHeight * randomRange(random, 0.08, 0.18),
      height: totalHeight * randomRange(random, 0.34, 0.48),
      radiusX: middleRadiusX,
      radiusZ: middleRadiusZ,
      snowHeight: totalHeight * randomRange(random, 0.12, 0.23),
      snowRadiusFactor: middleSnowRadiusFactor,
      yawOffset: randomRange(random, -0.35, 0.35),
      offsetX: randomRange(random, -layerJitter, layerJitter),
      offsetZ: randomRange(random, -layerJitter, layerJitter),
    },
    {
      bottom: ground + trunkHeight + totalHeight * randomRange(random, 0.28, 0.4),
      height: totalHeight * randomRange(random, 0.28, 0.42),
      radiusX: upperRadiusX,
      radiusZ: upperRadiusZ,
      snowHeight: totalHeight * randomRange(random, 0.11, 0.22),
      snowRadiusFactor: randomRange(random, 0.76, 0.9),
      yawOffset: randomRange(random, -0.42, 0.42),
      offsetX: randomRange(random, -layerJitter, layerJitter),
      offsetZ: randomRange(random, -layerJitter, layerJitter),
    },
  ];

  addTreeLayerMatrix(dummy, lowerNeedleMatrices, lowerSnowMatrices, layers[0], x, z, yaw, leanX, leanZ);
  addTreeLayerMatrix(dummy, middleNeedleMatrices, middleSnowMatrices, layers[1], x, z, yaw, leanX, leanZ);
  addTreeLayerMatrix(dummy, upperNeedleMatrices, upperSnowMatrices, layers[2], x, z, yaw, leanX, leanZ);
}

function addTreeLayerMatrix(dummy, needleMatrices, snowMatrices, layer, x, z, yaw, leanX, leanZ) {
  const layerX = x + layer.offsetX;
  const layerZ = z + layer.offsetZ;
  const layerYaw = yaw + layer.yawOffset;
  const centerY = layer.bottom + layer.height / 2;
  setMatrix(dummy, layerX, centerY, layerZ, layerYaw, leanX, leanZ, layer.radiusX, layer.height, layer.radiusZ);
  needleMatrices.push(dummy.matrix.clone());

  const snowY = layer.bottom + layer.height - layer.snowHeight / 2 + 0.04;
  const snowRadiusX = layer.radiusX * layer.snowRadiusFactor;
  const snowRadiusZ = layer.radiusZ * layer.snowRadiusFactor;
  setMatrix(dummy, layerX, snowY, layerZ, layerYaw, leanX, leanZ, snowRadiusX, layer.snowHeight, snowRadiusZ);
  snowMatrices.push(dummy.matrix.clone());
}

function addTreeInstancedMesh(scene, geometry, material, matrices, name) {
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

function snowColorAt(x, z, elevation, slope) {
  const normalizedElevation = THREE.MathUtils.clamp((elevation + 52) / 245, 0, 1);
  const windNoise = fbm(x * 0.018 - 7, z * 0.018 + 13, 4);
  const driftNoise = fbm(x * 0.006 + 22, z * 0.006 - 4, 5);
  const base = new THREE.Color(0xe5ecec);
  const highSnow = new THREE.Color(0xf8fbf8);
  const blueShadow = new THREE.Color(0xb5c5cc);
  const windScour = new THREE.Color(0x9ea8aa);
  const exposedRock = new THREE.Color(0x6f7472);

  base.lerp(highSnow, normalizedElevation * 0.45 + driftNoise * 0.15);
  base.lerp(blueShadow, THREE.MathUtils.clamp(slope * 0.42, 0, 0.34));

  if (slope > 0.55 && windNoise > 0.57) {
    base.lerp(exposedRock, THREE.MathUtils.clamp((slope - 0.45) * 1.6, 0.18, 0.48));
  } else if (windNoise > 0.66) {
    base.lerp(windScour, 0.16);
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
    Math.exp(-Math.pow(across / 38, 2)) *
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
