/*
  RQ-11B Raven / Raven B public-reference air UAS surrogate, all-in-one Three.js file.

  Usage after loading this file:
    const asset = RavenAirThreeJS.createRavenAirSurrogate(THREE, {
      showInternal: true,
      showCollision: false,
      ghostExterior: false,
      showLabels: true
    });
    scene.add(asset.group);

  Optional full viewer:
    RavenAirThreeJS.createRavenViewer(THREE, document.body);

  This is a non-operational visual and simulation surrogate. Internal zones are fictional
  environmental stress volumes, not exact real component placement or operational design data.
*/

(function attachRavenAirThreeJS(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.RavenAirThreeJS = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function buildApi() {
  "use strict";

  const RAVEN_PHYSICS_METADATA = Object.freeze({
    asset_id: "rq11b_raven_air_public_surrogate",
    display_name: "RQ-11B Raven / Raven B air UAS public-reference surrogate",
    classification: "non-operational CAD/Three.js surrogate",
    units: "meters",
    source_basis: {
      public_points_used: [
        "AeroVironment public Raven B page: Group 1 hand-launchable tactical ISR UAS",
        "AeroVironment public dimensions: 4.5 ft / 1.4 m wingspan, 3 ft / 0.9 m length",
        "AeroVironment public aircraft weight: 4.8 lb / 2.2 kg for current Raven B page",
        "USAF public fact sheet: direct-drive electric motor, 4.5 ft wingspan, 3 ft length, 60-90 minute endurance, 10 km range",
        "U.S. Army public article: hand-launched, 90 minute flight time, about 10 km range, 4.5 ft wingspan, 4.2 lb aircraft weight",
        "public photos used for exterior form cues: slender fuselage pod, shoulder-mounted wing, pusher propeller, tail boom and tail surfaces"
      ],
      not_used: [
        "no hidden electronic board placement",
        "no exact flight-control tuning",
        "no real antenna layout or datalink implementation",
        "no exact payload wiring, sensor internals, or vulnerability mapping",
        "no controlled technical data"
      ]
    },
    approximate_overall_dimensions_m: {
      wingspan: 1.37,
      length: 0.90,
      fuselage_pod_length: 0.64,
      wing_root_chord: 0.25,
      wing_tip_chord: 0.08,
      tailplane_span: 0.36,
      propeller_diameter_visual: 0.31
    },
    mass_properties: {
      mass_kg_current_public_page: 2.2,
      mass_kg_army_public_article: 1.9,
      simulator_mass_kg: 2.1,
      center_of_mass_m_estimate: [0.03, 0.0, 0.075],
      inertia_tensor_kg_m2_estimate: {
        ixx: 0.065,
        iyy: 0.028,
        izz: 0.084
      },
      confidence: "medium for gross mass/dimensions from public sources; low for COM/inertia demo estimates"
    },
    coordinate_frame: {
      origin: "approximate centerline under wing root",
      x_axis: "forward toward nose",
      y_axis: "left/right across wingspan",
      z_axis: "up"
    },
    collision_primitives: [
      { name: "fuselage_pod", type: "box", center_m: [0.105, 0.0, 0.080], size_m: [0.64, 0.110, 0.105] },
      { name: "left_wing_panel", type: "box", center_m: [-0.010, 0.365, 0.174], size_m: [0.24, 0.64, 0.052] },
      { name: "right_wing_panel", type: "box", center_m: [-0.010, -0.365, 0.174], size_m: [0.24, 0.64, 0.052] },
      { name: "tail_boom", type: "box", center_m: [-0.370, 0.0, 0.085], size_m: [0.33, 0.032, 0.030] },
      { name: "tailplane", type: "box", center_m: [-0.500, 0.0, 0.122], size_m: [0.150, 0.36, 0.030] },
      { name: "propeller_safety_disk", type: "cylinder", center_m: [-0.218, 0.0, 0.160], radius_m: 0.155, depth_m: 0.018, axis: "x" }
    ],
    aerodynamic_surrogate_demo_only: {
      drive_type: "single electric pusher propeller",
      launch_method: "hand-launched",
      recovery_method: "deep-stall/autonomous recovery public capability",
      public_capability_points: {
        operational_range_km: 10,
        endurance_min_public_range: [60, 90],
        endurance_min_current_page: 75,
        typical_altitude_agl_m_public_range: [30, 152]
      },
      simulator_defaults: {
        cruise_speed_mps: 11.6,
        dash_speed_mps: 22.5,
        stall_speed_mps_demo_only: 8.0,
        wing_area_m2_demo_only: 0.255,
        lift_curve_slope_demo_only: 4.8,
        drag_coefficient_clean_demo_only: 0.075
      }
    },
    surrogate_internal_zones: [
      {
        name: "battery_pack_zone",
        center_m: [0.035, 0.0, 0.076],
        size_m: [0.185, 0.060, 0.044],
        purpose: "environmental degradation model only",
        failure_modes: ["cold_capacity_loss", "heat_accelerated_aging", "humidity_connector_corrosion"]
      },
      {
        name: "avionics_flight_controller_zone",
        center_m: [0.175, 0.0, 0.087],
        size_m: [0.120, 0.062, 0.030],
        purpose: "environmental degradation model only",
        failure_modes: ["humidity_corrosion", "thermal_drift", "shock_vibration_fault"]
      },
      {
        name: "eo_ir_payload_zone",
        center_m: [0.382, 0.0, 0.038],
        size_m: [0.070, 0.060, 0.052],
        purpose: "environmental degradation model only",
        failure_modes: ["dust_lens_occlusion", "humidity_condensation", "thermal_noise", "uv_seal_aging"]
      },
      {
        name: "motor_esc_zone",
        center_m: [-0.210, 0.0, 0.134],
        size_m: [0.074, 0.054, 0.048],
        purpose: "environmental degradation model only",
        failure_modes: ["thermal_derating", "dust_ingestion", "humidity_connector_corrosion"]
      },
      {
        name: "wing_spar_joint_zone",
        center_m: [0.000, 0.0, 0.155],
        size_m: [0.090, 0.235, 0.032],
        purpose: "environmental degradation model only",
        failure_modes: ["thermal_cycle_fatigue", "uv_composite_aging", "impact_crack_growth"]
      },
      {
        name: "tail_servo_zone",
        center_m: [-0.445, 0.0, 0.098],
        size_m: [0.060, 0.044, 0.032],
        purpose: "environmental degradation model only",
        failure_modes: ["cold_servo_stiction", "humidity_corrosion", "dust_joint_fouling"]
      }
    ],
    environmental_stress_coefficients_demo_only: {
      extreme_heat_middle_east: {
        battery_pack_zone: 1.28,
        avionics_flight_controller_zone: 1.34,
        eo_ir_payload_zone: 1.42,
        motor_esc_zone: 1.58,
        wing_spar_joint_zone: 1.12,
        tail_servo_zone: 1.20
      },
      dust_desert: {
        battery_pack_zone: 1.08,
        avionics_flight_controller_zone: 1.18,
        eo_ir_payload_zone: 1.65,
        motor_esc_zone: 1.46,
        wing_spar_joint_zone: 1.10,
        tail_servo_zone: 1.34
      },
      extreme_cold_eastern_europe: {
        battery_pack_zone: 1.86,
        avionics_flight_controller_zone: 1.14,
        eo_ir_payload_zone: 1.18,
        motor_esc_zone: 1.22,
        wing_spar_joint_zone: 1.18,
        tail_servo_zone: 1.52
      },
      humidity_maritime: {
        battery_pack_zone: 1.24,
        avionics_flight_controller_zone: 1.48,
        eo_ir_payload_zone: 1.58,
        motor_esc_zone: 1.30,
        wing_spar_joint_zone: 1.16,
        tail_servo_zone: 1.40
      },
      high_uv_desert: {
        battery_pack_zone: 1.08,
        avionics_flight_controller_zone: 1.10,
        eo_ir_payload_zone: 1.24,
        motor_esc_zone: 1.08,
        wing_spar_joint_zone: 1.44,
        tail_servo_zone: 1.20
      }
    }
  });

  const COLORS = Object.freeze({
    airframe: 0xc4c8c2,
    wingTop: 0xd0d4cd,
    wingBottom: 0xaeb5ae,
    seam: 0x303635,
    carbon: 0x141817,
    rubber: 0x090a0a,
    lens: 0x0b3140,
    prop: 0x202423,
    warning: 0x59615f,
    marking: 0x4d5552,
    flagRed: 0xb33a2e,
    flagBlue: 0x273f6d,
    fastener: 0x68706c,
    battery: 0x2369ff,
    avionics: 0x2ca85f,
    payload: 0x42d6df,
    motor: 0xe77c1e,
    spar: 0xe4b11e,
    servo: 0x8952d0,
    collision: 0x36b5ff
  });

  function makeMaterials(THREE, options) {
    const ghostExterior = Boolean(options.ghostExterior && options.showInternal);
    const opacity = ghostExterior ? 0.42 : 1.0;
    const standard = (color, roughness = 0.65, metalness = 0.08, materialOpacity = opacity) =>
      new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness,
        side: THREE.FrontSide,
        depthWrite: true,
        depthTest: true,
        transparent: materialOpacity < 1,
        opacity: materialOpacity
      });

    const mats = {
      airframe: standard(COLORS.airframe, 0.72, 0.04),
      wingTop: standard(COLORS.wingTop, 0.70, 0.04),
      wingBottom: standard(COLORS.wingBottom, 0.76, 0.03),
      seam: standard(COLORS.seam, 0.82, 0.02),
      carbon: standard(COLORS.carbon, 0.72, 0.18),
      rubber: standard(COLORS.rubber, 0.92, 0.02),
      lens: new THREE.MeshPhysicalMaterial({
        color: COLORS.lens,
        roughness: 0.18,
        metalness: 0.0,
        side: THREE.FrontSide,
        depthWrite: true,
        depthTest: true,
        transparent: opacity < 1,
        opacity
      }),
      prop: standard(COLORS.prop, 0.58, 0.22),
      propBlur: new THREE.MeshBasicMaterial({
        color: COLORS.prop,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        side: THREE.DoubleSide
      }),
      warning: standard(COLORS.warning, 0.62, 0.08),
      battery: standard(COLORS.battery, 0.46, 0.18, 0.62),
      avionics: standard(COLORS.avionics, 0.46, 0.18, 0.58),
      payload: standard(COLORS.payload, 0.40, 0.12, 0.58),
      motor: standard(COLORS.motor, 0.48, 0.16, 0.58),
      spar: standard(COLORS.spar, 0.44, 0.16, 0.55),
      servo: standard(COLORS.servo, 0.50, 0.16, 0.58),
      marking: standard(COLORS.marking, 0.78, 0.03),
      flagRed: standard(COLORS.flagRed, 0.72, 0.02),
      flagBlue: standard(COLORS.flagBlue, 0.72, 0.02),
      fastener: standard(COLORS.fastener, 0.80, 0.04),
      collision: new THREE.MeshBasicMaterial({
        color: COLORS.collision,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        wireframe: true
      })
    };
    return mats;
  }

  function v3(THREE, p) {
    return new THREE.Vector3(p[0], p[1], p[2]);
  }

  function addNamed(parent, child, name) {
    child.name = name;
    parent.add(child);
    return child;
  }

  function makeBox(THREE, materials, center, size, materialName, name) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), materials[materialName]);
    mesh.position.set(center[0], center[1], center[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.center_m = center.slice();
    mesh.userData.size_m = size.slice();
    if (name) mesh.name = name;
    return mesh;
  }

  function makeCylinder(THREE, materials, center, radius, length, axis, materialName, name, radialSegments = 48) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, radialSegments, 1, false), materials[materialName]);
    mesh.position.set(center[0], center[1], center[2]);
    if (axis === "x") mesh.rotation.z = Math.PI / 2;
    if (axis === "z") mesh.rotation.x = Math.PI / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (name) mesh.name = name;
    return mesh;
  }

  function makeCylinderBetween(THREE, materials, pointA, pointB, radius, materialName, name, radialSegments = 32) {
    const a = v3(THREE, pointA);
    const b = v3(THREE, pointB);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), radialSegments, 1, false), materials[materialName]);
    mesh.position.copy(a.clone().add(b).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (name) mesh.name = name;
    return mesh;
  }

  function makeEllipsoid(THREE, materials, center, scale, materialName, name, widthSegments = 64, heightSegments = 32) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, widthSegments, heightSegments), materials[materialName]);
    mesh.position.set(center[0], center[1], center[2]);
    mesh.scale.set(scale[0], scale[1], scale[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (name) mesh.name = name;
    return mesh;
  }

  function makeExtrudedPanel(THREE, materials, points, thickness, materialName, name) {
    const shape = new THREE.Shape();
    shape.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
    shape.closePath();
    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: true,
      bevelThickness: Math.min(thickness * 0.26, 0.004),
      bevelSize: Math.min(thickness * 0.32, 0.005),
      bevelSegments: 4,
      curveSegments: 12
    });
    geom.translate(0, 0, -thickness / 2);
    geom.computeVertexNormals();
    const mesh = new THREE.Mesh(geom, materials[materialName]);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function makeRoundedBox(THREE, materials, center, size, radius, materialName, name) {
    const halfX = size[0] / 2;
    const halfZ = size[2] / 2;
    const r = Math.max(0.001, Math.min(radius, halfX - 0.001, halfZ - 0.001));
    const shape = new THREE.Shape();
    shape.moveTo(-halfX + r, -halfZ);
    shape.lineTo(halfX - r, -halfZ);
    shape.quadraticCurveTo(halfX, -halfZ, halfX, -halfZ + r);
    shape.lineTo(halfX, halfZ - r);
    shape.quadraticCurveTo(halfX, halfZ, halfX - r, halfZ);
    shape.lineTo(-halfX + r, halfZ);
    shape.quadraticCurveTo(-halfX, halfZ, -halfX, halfZ - r);
    shape.lineTo(-halfX, -halfZ + r);
    shape.quadraticCurveTo(-halfX, -halfZ, -halfX + r, -halfZ);

    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: size[1],
      bevelEnabled: true,
      bevelThickness: Math.min(size[1] * 0.12, 0.006),
      bevelSize: Math.min(r * 0.32, 0.010),
      bevelSegments: 5,
      curveSegments: 16
    });
    geom.translate(0, 0, -size[1] / 2);
    geom.rotateX(Math.PI / 2);
    geom.translate(center[0], center[1], center[2]);
    geom.computeVertexNormals();

    const mesh = new THREE.Mesh(geom, materials[materialName]);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.center_m = center.slice();
    mesh.userData.size_m = size.slice();
    return mesh;
  }

  function makeLoftedFuselage(THREE, materials) {
    const stations = [
      { x: 0.425, y: 0.012, z: 0.014, cz: 0.065 },
      { x: 0.388, y: 0.039, z: 0.039, cz: 0.067 },
      { x: 0.300, y: 0.051, z: 0.047, cz: 0.073 },
      { x: 0.150, y: 0.053, z: 0.050, cz: 0.080 },
      { x: -0.045, y: 0.048, z: 0.049, cz: 0.087 },
      { x: -0.168, y: 0.038, z: 0.044, cz: 0.096 },
      { x: -0.235, y: 0.025, z: 0.032, cz: 0.108 }
    ];
    const radialSegments = 32;
    const verts = [];
    const indices = [];

    stations.forEach(station => {
      for (let j = 0; j < radialSegments; j++) {
        const t = (j / radialSegments) * Math.PI * 2;
        const y = Math.cos(t) * station.y;
        const z = station.cz + Math.sin(t) * station.z;
        verts.push([station.x, y, z]);
      }
    });

    for (let i = 0; i < stations.length - 1; i++) {
      for (let j = 0; j < radialSegments; j++) {
        const a = i * radialSegments + j;
        const b = i * radialSegments + ((j + 1) % radialSegments);
        const c = (i + 1) * radialSegments + ((j + 1) % radialSegments);
        const d = (i + 1) * radialSegments + j;
        indices.push(a, b, c, a, c, d);
      }
    }

    const frontCenter = verts.length;
    verts.push([stations[0].x, 0, stations[0].cz]);
    const rearCenter = verts.length;
    verts.push([stations[stations.length - 1].x, 0, stations[stations.length - 1].cz]);
    for (let j = 0; j < radialSegments; j++) {
      indices.push(frontCenter, j, (j + 1) % radialSegments);
      const rearBase = (stations.length - 1) * radialSegments;
      indices.push(rearCenter, rearBase + ((j + 1) % radialSegments), rearBase + j);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(verts.flat(), 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    const mesh = new THREE.Mesh(geom, materials.airframe);
    mesh.name = "lofted_rounded_rect_fuselage_pod";
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function makeWingPanel(THREE, materials, side) {
    const stations = [
      { y: side * 0.046, centerX: 0.018, chord: 0.250, z: 0.150, t: 0.022 },
      { y: side * 0.180, centerX: 0.010, chord: 0.238, z: 0.158, t: 0.020 },
      { y: side * 0.380, centerX: -0.010, chord: 0.205, z: 0.178, t: 0.018 },
      { y: side * 0.565, centerX: -0.040, chord: 0.158, z: 0.200, t: 0.015 },
      { y: side * 0.685, centerX: -0.067, chord: 0.070, z: 0.214, t: 0.010 }
    ];

    const verts = [];
    const indices = [];
    stations.forEach(station => {
      const leading = station.centerX + station.chord / 2;
      const trailing = station.centerX - station.chord / 2;
      verts.push(
        [leading, station.y, station.z + station.t / 2],
        [trailing, station.y, station.z + station.t / 2],
        [leading, station.y, station.z - station.t / 2],
        [trailing, station.y, station.z - station.t / 2]
      );
    });

    function quad(a, b, c, d) {
      indices.push(a, b, c, a, c, d);
    }

    for (let i = 0; i < stations.length - 1; i++) {
      const a = i * 4;
      const b = (i + 1) * 4;
      quad(a + 0, b + 0, b + 1, a + 1);
      quad(a + 2, a + 3, b + 3, b + 2);
      quad(a + 0, a + 2, b + 2, b + 0);
      quad(a + 1, b + 1, b + 3, a + 3);
    }
    quad(0, 1, 3, 2);
    const tip = (stations.length - 1) * 4;
    quad(tip + 0, tip + 2, tip + 3, tip + 1);

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(verts.flat(), 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    const mesh = new THREE.Mesh(geom, materials.wingTop);
    mesh.name = side > 0 ? "left_polyhedral_tapered_wing_panel" : "right_polyhedral_tapered_wing_panel";
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function makePrismSurface(THREE, materials, name, topPoints, bottomOffset, materialName = "wingTop") {
    const verts = topPoints.concat(topPoints.map(p => [p[0] + bottomOffset[0], p[1] + bottomOffset[1], p[2] + bottomOffset[2]]));
    const n = topPoints.length;
    const indices = [];
    for (let i = 1; i < n - 1; i++) indices.push(0, i, i + 1);
    for (let i = 1; i < n - 1; i++) indices.push(n, n + i + 1, n + i);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      indices.push(i, j, n + j, i, n + j, n + i);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(verts.flat(), 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    const mesh = new THREE.Mesh(geom, materials[materialName]);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function makeClosedLoft(THREE, materials, stations, radialSegments, materialName, name) {
    const verts = [];
    const indices = [];

    stations.forEach(station => {
      for (let j = 0; j < radialSegments; j++) {
        const t = (j / radialSegments) * Math.PI * 2;
        const c = Math.cos(t);
        const s = Math.sin(t);
        const lowerFlatten = s < 0 ? station.lowerFlatten ?? 0.76 : 1;
        const upperFullness = s > 0 ? station.upperFullness ?? 1.03 : 1;
        const chine = 1 - (station.chine ?? 0.05) * Math.pow(Math.abs(s), 4);
        verts.push([
          station.x,
          station.y * c * chine,
          station.z + station.rz * s * lowerFlatten * upperFullness
        ]);
      }
    });

    for (let i = 0; i < stations.length - 1; i++) {
      for (let j = 0; j < radialSegments; j++) {
        const a = i * radialSegments + j;
        const b = i * radialSegments + ((j + 1) % radialSegments);
        const c = (i + 1) * radialSegments + ((j + 1) % radialSegments);
        const d = (i + 1) * radialSegments + j;
        indices.push(a, d, c, a, c, b);
      }
    }

    const noseCenter = verts.length;
    verts.push([stations[0].x, 0, stations[0].z]);
    for (let j = 0; j < radialSegments; j++) indices.push(noseCenter, (j + 1) % radialSegments, j);

    const tailRing = (stations.length - 1) * radialSegments;
    const tailCenter = verts.length;
    verts.push([stations[stations.length - 1].x, 0, stations[stations.length - 1].z]);
    for (let j = 0; j < radialSegments; j++) indices.push(tailCenter, tailRing + j, tailRing + ((j + 1) % radialSegments));

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(verts.flat(), 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    geom.computeBoundingSphere();
    geom.computeBoundingBox();

    const mesh = new THREE.Mesh(geom, materials[materialName]);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.closedLoft = true;
    return mesh;
  }

  function makeStreamlinedFuselage(THREE, materials) {
    const stations = [
      { x: 0.375, y: 0.004, rz: 0.006, z: 0.062, chine: 0.00 },
      { x: 0.356, y: 0.026, rz: 0.030, z: 0.062, chine: 0.02 },
      { x: 0.318, y: 0.050, rz: 0.050, z: 0.064, chine: 0.03 },
      { x: 0.260, y: 0.062, rz: 0.055, z: 0.068, chine: 0.05 },
      { x: 0.175, y: 0.064, rz: 0.056, z: 0.074, chine: 0.06 },
      { x: 0.085, y: 0.059, rz: 0.054, z: 0.079, chine: 0.06 },
      { x: -0.035, y: 0.050, rz: 0.049, z: 0.083, chine: 0.05 },
      { x: -0.130, y: 0.039, rz: 0.040, z: 0.091, chine: 0.04 },
      { x: -0.205, y: 0.026, rz: 0.030, z: 0.104, chine: 0.03 },
      { x: -0.248, y: 0.011, rz: 0.014, z: 0.118, chine: 0.00 }
    ];
    const mesh = makeClosedLoft(THREE, materials, stations, 64, "airframe", "smooth_streamlined_lofted_fuselage");
    mesh.userData.profile = "smooth aerodynamic public-reference fuselage loft";
    return mesh;
  }

  function makePayloadPod(THREE, materials) {
    const stations = [
      { x: 0.320, y: 0.010, rz: 0.006, z: 0.028, lowerFlatten: 0.94 },
      { x: 0.292, y: 0.031, rz: 0.019, z: 0.021, lowerFlatten: 1.00 },
      { x: 0.250, y: 0.040, rz: 0.025, z: 0.016, lowerFlatten: 1.00 },
      { x: 0.210, y: 0.034, rz: 0.021, z: 0.019, lowerFlatten: 1.00 },
      { x: 0.180, y: 0.014, rz: 0.009, z: 0.030, lowerFlatten: 0.92 }
    ];
    return makeClosedLoft(THREE, materials, stations, 48, "airframe", "integrated_teardrop_payload_pod");
  }

  function airfoilPoint(xNorm, thicknessRatio, camberRatio, camberPos, upper) {
    const x = Math.max(0.0001, Math.min(0.9999, xNorm));
    const yt = 5 * thicknessRatio * (
      0.2969 * Math.sqrt(x) -
      0.1260 * x -
      0.3516 * x * x +
      0.2843 * x * x * x -
      0.1015 * x * x * x * x
    );
    const yc = x < camberPos
      ? camberRatio / (camberPos * camberPos) * (2 * camberPos * x - x * x)
      : camberRatio / ((1 - camberPos) * (1 - camberPos)) * ((1 - 2 * camberPos) + 2 * camberPos * x - x * x);
    return yc + (upper ? yt : -yt * 0.82);
  }

  function makeAirfoilSurface(THREE, materials, specs, side, materialName, name) {
    const chordSamples = 34;
    const verts = [];
    const indices = [];

    specs.forEach(spec => {
      const chord = spec.chord;
      const leadingX = spec.centerX + chord / 2;
      const y = side * spec.y;
      const zBase = spec.z;
      const thickness = spec.thickness ?? 0.105;
      const camber = spec.camber ?? 0.030;
      const camberPos = spec.camberPos ?? 0.42;

      for (let i = 0; i < chordSamples; i++) {
        const xNorm = i / (chordSamples - 1);
        verts.push([leadingX - xNorm * chord, y, zBase + airfoilPoint(xNorm, thickness, camber, camberPos, true) * chord]);
      }
      for (let i = 0; i < chordSamples; i++) {
        const xNorm = 1 - i / (chordSamples - 1);
        verts.push([leadingX - xNorm * chord, y, zBase + airfoilPoint(xNorm, thickness, camber, camberPos, false) * chord]);
      }
    });

    const ring = chordSamples * 2;
    for (let s = 0; s < specs.length - 1; s++) {
      const a0 = s * ring;
      const b0 = (s + 1) * ring;
      for (let i = 0; i < ring; i++) {
        const j = (i + 1) % ring;
        if (side > 0) indices.push(a0 + i, b0 + i, b0 + j, a0 + i, b0 + j, a0 + j);
        else indices.push(a0 + i, b0 + j, b0 + i, a0 + i, a0 + j, b0 + j);
      }
    }

    for (let cap of [0, specs.length - 1]) {
      const base = cap * ring;
      const center = verts.length;
      const c = [0, side * specs[cap].y, specs[cap].z];
      for (let i = 0; i < ring; i++) {
        c[0] += verts[base + i][0] / ring;
        c[2] += (verts[base + i][2] - specs[cap].z) / ring;
      }
      verts.push(c);
      for (let i = 0; i < ring; i++) {
        const j = (i + 1) % ring;
        if (cap === 0) indices.push(center, base + j, base + i);
        else indices.push(center, base + i, base + j);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(verts.flat(), 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    geom.computeBoundingSphere();
    geom.computeBoundingBox();

    const mesh = new THREE.Mesh(geom, materials[materialName]);
    mesh.name = side > 0 ? `left_${name}` : `right_${name}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.airfoil = true;
    return mesh;
  }

  function makeVerticalAeroSurface(THREE, materials, points, thickness, materialName, name) {
    const shape = new THREE.Shape();
    shape.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
    shape.closePath();
    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: true,
      bevelThickness: Math.min(thickness * 0.25, 0.003),
      bevelSize: Math.min(thickness * 0.35, 0.004),
      bevelSegments: 5,
      curveSegments: 18
    });
    geom.translate(0, 0, -thickness / 2);
    geom.rotateX(Math.PI / 2);
    geom.computeVertexNormals();
    const mesh = new THREE.Mesh(geom, materials[materialName]);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function makePropBlade(THREE, materials, angle) {
    const radialSteps = 16;
    const verts = [];
    const indices = [];
    const radial = new THREE.Vector2(Math.cos(angle), Math.sin(angle));
    const tangent = new THREE.Vector2(-Math.sin(angle), Math.cos(angle));

    for (let i = 0; i < radialSteps; i++) {
      const u = i / (radialSteps - 1);
      const r = 0.024 + u * 0.092;
      const halfWidth = 0.010 + Math.sin(u * Math.PI) * 0.014 + u * 0.006;
      const twist = (0.014 - u * 0.028);
      const thickness = 0.0035 * (1 - u * 0.45);
      for (let side = -1; side <= 1; side += 2) {
        const y = radial.x * r + tangent.x * halfWidth * side;
        const z = radial.y * r + tangent.y * halfWidth * side;
        verts.push([-0.006 + twist, y, z + thickness]);
        verts.push([0.006 + twist, y, z - thickness]);
      }
    }

    for (let i = 0; i < radialSteps - 1; i++) {
      const a = i * 4;
      const b = (i + 1) * 4;
      indices.push(a, b, b + 2, a, b + 2, a + 2);
      indices.push(a + 1, a + 3, b + 3, a + 1, b + 3, b + 1);
      indices.push(a, a + 1, b + 1, a, b + 1, b);
      indices.push(a + 2, b + 2, b + 3, a + 2, b + 3, a + 3);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(verts.flat(), 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    const mesh = new THREE.Mesh(geom, materials.prop);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function makePropellerGroup(THREE, materials) {
    const prop = new THREE.Group();
    prop.name = "animated_two_blade_propeller";
    prop.position.set(-0.250, 0, 0.188);
    prop.add(makeCylinder(THREE, materials, [0, 0, 0], 0.025, 0.040, "x", "carbon", "pusher_motor_hub", 48));
    prop.add(makeCylinder(THREE, materials, [0.002, 0, 0], 0.118, 0.003, "x", "propBlur", "subtle_spinning_prop_blur_disk", 72));
    prop.add(makePropBlade(THREE, materials, Math.PI / 2));
    prop.add(makePropBlade(THREE, materials, Math.PI * 1.5));
    return prop;
  }

  function addAirframe(THREE, materials, parent) {
    const airframe = new THREE.Group();
    airframe.name = "production_grade_recon_uav_airframe";

    airframe.add(makeStreamlinedFuselage(THREE, materials));
    airframe.add(makePayloadPod(THREE, materials));

    addNamed(airframe, makeEllipsoid(THREE, materials, [0.306, 0, 0.018], [0.036, 0.031, 0.025], "lens", "forward_gimbaled_sensor_glass", 64, 32));
    addNamed(airframe, makeCylinder(THREE, materials, [0.360, 0, 0.061], 0.012, 0.008, "x", "lens", "small_forward_camera_aperture", 48));
    addNamed(airframe, makeEllipsoid(THREE, materials, [0.010, 0, 0.153], [0.178, 0.116, 0.032], "airframe", "smooth_wing_root_fairing", 64, 24));
    addNamed(airframe, makeEllipsoid(THREE, materials, [0.015, 0.070, 0.163], [0.145, 0.042, 0.022], "airframe", "right_blended_wing_root_filleting", 48, 18));
    addNamed(airframe, makeEllipsoid(THREE, materials, [0.015, -0.070, 0.163], [0.145, 0.042, 0.022], "airframe", "left_blended_wing_root_filleting", 48, 18));
    addNamed(airframe, makeEllipsoid(THREE, materials, [0.245, 0, 0.034], [0.102, 0.045, 0.019], "airframe", "smooth_payload_pod_upper_blend", 48, 18));
    addNamed(airframe, makeBox(THREE, materials, [0.070, 0, 0.131], [0.212, 0.056, 0.006], "seam"), "flush_top_service_hatch_outline");
    addNamed(airframe, makeBox(THREE, materials, [0.210, 0.055, 0.064], [0.152, 0.004, 0.004], "seam"), "right_side_access_panel_upper");
    addNamed(airframe, makeBox(THREE, materials, [0.210, -0.055, 0.064], [0.152, 0.004, 0.004], "seam"), "left_side_access_panel_upper");
    addNamed(airframe, makeBox(THREE, materials, [0.210, 0.055, 0.033], [0.152, 0.004, 0.004], "seam"), "right_side_access_panel_lower");
    addNamed(airframe, makeBox(THREE, materials, [0.210, -0.055, 0.033], [0.152, 0.004, 0.004], "seam"), "left_side_access_panel_lower");

    const wingSpecs = [
      { y: 0.045, centerX: 0.015, chord: 0.270, z: 0.155, thickness: 0.115, camber: 0.034 },
      { y: 0.180, centerX: 0.008, chord: 0.252, z: 0.164, thickness: 0.110, camber: 0.033 },
      { y: 0.380, centerX: -0.015, chord: 0.208, z: 0.183, thickness: 0.102, camber: 0.030 },
      { y: 0.565, centerX: -0.043, chord: 0.150, z: 0.204, thickness: 0.092, camber: 0.026 },
      { y: 0.685, centerX: -0.072, chord: 0.068, z: 0.216, thickness: 0.078, camber: 0.020 }
    ];
    [-1, 1].forEach(side => {
      airframe.add(makeAirfoilSurface(THREE, materials, wingSpecs, side, "wingTop", "cambered_dihedral_main_wing"));
      addNamed(airframe, makeCylinderBetween(THREE, materials, [0.145, side * 0.052, 0.157], [0.005, side * 0.675, 0.218], 0.0026, "seam", side > 0 ? "left_polished_leading_edge_seam" : "right_polished_leading_edge_seam", 20));
      addNamed(airframe, makeCylinderBetween(THREE, materials, [-0.116, side * 0.300, 0.177], [-0.092, side * 0.642, 0.210], 0.0028, "seam", side > 0 ? "left_aileron_hinge_line" : "right_aileron_hinge_line", 16));
      addNamed(airframe, makeBox(THREE, materials, [-0.090, side * 0.485, 0.202], [0.006, 0.160, 0.003], "seam"), side > 0 ? "left_aileron_gap" : "right_aileron_gap");
      [0.180, 0.355, 0.530].forEach((y, i) => {
        addNamed(airframe, makeCylinder(THREE, materials, [-0.010, side * y, 0.191 + y * 0.035], 0.0032, 0.0025, "z", "fastener", `wing_fastener_${side}_${i}`, 18));
      });
    });

    addNamed(airframe, makeEllipsoid(THREE, materials, [-0.222, 0, 0.101], [0.058, 0.034, 0.040], "airframe", "aft_fuselage_tail_cone_blend", 48, 20));
    addNamed(airframe, makeCylinderBetween(THREE, materials, [-0.220, 0, 0.112], [-0.228, 0, 0.064], 0.018, "airframe", "integrated_vertical_boom_fairing", 32));
    addNamed(airframe, makeEllipsoid(THREE, materials, [-0.238, 0, 0.068], [0.040, 0.028, 0.019], "airframe", "integrated_tail_boom_socket", 48, 18));
    addNamed(airframe, makeCylinderBetween(THREE, materials, [-0.228, 0, 0.063], [-0.590, 0, 0.066], 0.0085, "carbon", "slender_carbon_tail_boom"));
    addNamed(airframe, makeCylinderBetween(THREE, materials, [-0.225, 0.021, 0.108], [-0.250, 0.010, 0.188], 0.0065, "carbon", "right_motor_mount_strut", 24));
    addNamed(airframe, makeCylinderBetween(THREE, materials, [-0.225, -0.021, 0.108], [-0.250, -0.010, 0.188], 0.0065, "carbon", "left_motor_mount_strut", 24));
    addNamed(airframe, makeEllipsoid(THREE, materials, [-0.236, 0, 0.130], [0.034, 0.030, 0.040], "airframe", "upper_motor_pylon_blend", 48, 18));
    addNamed(airframe, makeCylinderBetween(THREE, materials, [-0.238, 0, 0.124], [-0.250, 0, 0.188], 0.015, "carbon", "central_motor_pylon_fairing", 32));
    addNamed(airframe, makeVerticalAeroSurface(THREE, materials, [
      [-0.250, 0.188],
      [-0.232, 0.132],
      [-0.196, 0.124],
      [-0.222, 0.174]
    ], 0.028, "carbon", "solid_pusher_motor_mount_plate"));
    addNamed(airframe, makeEllipsoid(THREE, materials, [-0.250, 0, 0.188], [0.038, 0.031, 0.030], "carbon", "rear_pusher_motor_housing", 64, 24));
    airframe.add(makePropellerGroup(THREE, materials));

    const tailSpecs = [
      { y: 0.020, centerX: -0.500, chord: 0.150, z: 0.098, thickness: 0.082, camber: 0.012 },
      { y: 0.095, centerX: -0.520, chord: 0.125, z: 0.101, thickness: 0.075, camber: 0.010 },
      { y: 0.180, centerX: -0.550, chord: 0.075, z: 0.105, thickness: 0.060, camber: 0.006 }
    ];
    [-1, 1].forEach(side => {
      airframe.add(makeAirfoilSurface(THREE, materials, tailSpecs, side, "wingTop", "thin_airfoil_horizontal_stabilizer"));
      addNamed(airframe, makeCylinderBetween(THREE, materials, [-0.555, side * 0.052, 0.101], [-0.573, side * 0.170, 0.106], 0.0020, "seam", side > 0 ? "left_elevator_hinge" : "right_elevator_hinge", 12));
    });
    addNamed(airframe, makeEllipsoid(THREE, materials, [-0.505, 0, 0.088], [0.070, 0.048, 0.024], "airframe", "tailplane_root_saddle_fairing", 48, 18));
    addNamed(airframe, makeCylinderBetween(THREE, materials, [-0.506, 0, 0.064], [-0.506, 0, 0.104], 0.0105, "airframe", "vertical_tailplane_boom_post", 24));
    addNamed(airframe, makeCylinderBetween(THREE, materials, [-0.488, 0.018, 0.068], [-0.500, 0.090, 0.102], 0.0045, "carbon", "right_tailplane_support_strut", 16));
    addNamed(airframe, makeCylinderBetween(THREE, materials, [-0.488, -0.018, 0.068], [-0.500, -0.090, 0.102], 0.0045, "carbon", "left_tailplane_support_strut", 16));

    const fin = makeVerticalAeroSurface(THREE, materials, [
      [-0.548, 0.085],
      [-0.414, 0.091],
      [-0.456, 0.244],
      [-0.508, 0.224]
    ], 0.020, "wingTop", "thin_swept_vertical_stabilizer");
    airframe.add(fin);
    addNamed(airframe, makeCylinderBetween(THREE, materials, [-0.500, 0, 0.066], [-0.500, 0, 0.116], 0.0075, "airframe", "vertical_fin_root_post", 24));
    addNamed(airframe, makeBox(THREE, materials, [-0.492, 0.012, 0.156], [0.004, 0.003, 0.095], "seam"), "right_rudder_hinge_line");
    addNamed(airframe, makeBox(THREE, materials, [-0.492, -0.012, 0.156], [0.004, 0.003, 0.095], "seam"), "left_rudder_hinge_line");
    addNamed(airframe, makeBox(THREE, materials, [-0.468, 0.013, 0.208], [0.026, 0.003, 0.012], "flagRed"), "small_fin_red_marking");
    addNamed(airframe, makeBox(THREE, materials, [-0.468, 0.014, 0.222], [0.026, 0.003, 0.010], "flagBlue"), "small_fin_blue_marking");
    addNamed(airframe, makeBox(THREE, materials, [-0.470, -0.013, 0.198], [0.052, 0.003, 0.006], "marking"), "left_fin_serial_rq11");

    addNamed(airframe, makeCylinder(THREE, materials, [0.226, 0.052, 0.107], 0.0035, 0.052, "z", "rubber", "right_short_whip_antenna", 12));
    addNamed(airframe, makeCylinder(THREE, materials, [0.164, -0.052, 0.103], 0.0032, 0.044, "z", "rubber", "left_short_whip_antenna", 12));
    addNamed(airframe, makeBox(THREE, materials, [-0.112, 0, 0.045], [0.112, 0.042, 0.009], "rubber"), "flush_rubberized_hand_launch_grip");

    parent.add(airframe);
    return airframe;
  }

  function makeLabelSprite(THREE, text) {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 512;
    canvas.height = 128;
    ctx.fillStyle = "rgba(9, 12, 14, 0.78)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(232, 238, 242, 0.74)";
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
    ctx.font = "600 38px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.fillStyle = "rgba(232, 238, 242, 0.96)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text.replace(/_/g, " "), canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    sprite.scale.set(0.23, 0.058, 1);
    sprite.name = `label_${text}`;
    return sprite;
  }

  function addInternalSurrogates(THREE, materials, parent, options) {
    const internal = new THREE.Group();
    internal.name = "surrogate_internal_environmental_zones";
    internal.visible = options.showInternal !== false;

    const zones = [
      { name: "battery_pack_zone", center: [0.035, 0, 0.076], size: [0.185, 0.060, 0.044], mat: "battery", label: "battery" },
      { name: "avionics_flight_controller_zone", center: [0.175, 0, 0.087], size: [0.120, 0.062, 0.030], mat: "avionics", label: "avionics" },
      { name: "eo_ir_payload_zone", center: [0.382, 0, 0.038], size: [0.070, 0.060, 0.052], mat: "payload", label: "EO / IR" },
      { name: "motor_esc_zone", center: [-0.210, 0, 0.134], size: [0.074, 0.054, 0.048], mat: "motor", label: "motor / ESC" },
      { name: "wing_spar_joint_zone", center: [0.000, 0, 0.155], size: [0.090, 0.235, 0.032], mat: "spar", label: "wing spar" },
      { name: "tail_servo_zone", center: [-0.445, 0, 0.098], size: [0.060, 0.044, 0.032], mat: "servo", label: "tail servo" }
    ];

    zones.forEach(zone => {
      const mesh = makeBox(THREE, materials, zone.center, zone.size, zone.mat, zone.name);
      mesh.userData.zone = zone.name;
      mesh.userData.nonOperationalSurrogate = true;
      internal.add(mesh);
      if (options.showLabels) {
        const label = makeLabelSprite(THREE, zone.label);
        if (label) {
          label.position.set(zone.center[0], zone.center[1], zone.center[2] + zone.size[2] / 2 + 0.050);
          internal.add(label);
        }
      }
    });

    parent.add(internal);
    return internal;
  }

  function createCollisionGroup(THREE, materials, metadata) {
    const collision = new THREE.Group();
    collision.name = "raven_collision_primitives";

    metadata.collision_primitives.forEach(primitive => {
      let mesh = null;
      if (primitive.type === "box") {
        mesh = makeBox(THREE, materials, primitive.center_m, primitive.size_m, "collision", `collision_${primitive.name}`);
      } else if (primitive.type === "cylinder") {
        mesh = makeCylinder(THREE, materials, primitive.center_m, primitive.radius_m, primitive.depth_m, primitive.axis, "collision", `collision_${primitive.name}`, 32);
      }

      if (mesh) {
        mesh.userData.physicsPrimitive = primitive;
        collision.add(mesh);
      }
    });

    return collision;
  }

  function createRavenAirSurrogate(THREE, options = {}) {
    if (!THREE) throw new Error("Pass the THREE namespace: createRavenAirSurrogate(THREE, options)");

    const settings = {
      showInternal: true,
      showCollision: false,
      ghostExterior: false,
      showLabels: true,
      ...options
    };
    const materials = makeMaterials(THREE, settings);
    const group = new THREE.Group();
    group.name = "rq11b_raven_air_public_surrogate";
    group.userData.metadata = RAVEN_PHYSICS_METADATA;

    const exterior = addAirframe(THREE, materials, group);
    const internalGroup = addInternalSurrogates(THREE, materials, group, settings);
    const collisionGroup = createCollisionGroup(THREE, materials, RAVEN_PHYSICS_METADATA);
    collisionGroup.visible = Boolean(settings.showCollision);
    group.add(collisionGroup);

    const com = makeCylinder(THREE, materials, RAVEN_PHYSICS_METADATA.mass_properties.center_of_mass_m_estimate, 0.018, 0.005, "z", "spar", "center_of_mass_marker", 24);
    com.userData.centerOfMass = true;
    group.add(com);

    return {
      group,
      exterior,
      internalGroup,
      collisionGroup,
      materials,
      metadata: RAVEN_PHYSICS_METADATA
    };
  }

  function installSimpleOrbitControls(THREE, camera, domElement, target = new THREE.Vector3(0.0, 0, 0.11)) {
    const state = {
      azimuth: -1.5708,
      elevation: 0.20,
      distance: 2.05,
      dragging: false,
      lastX: 0,
      lastY: 0
    };

    function updateCamera() {
      const horizontal = Math.cos(state.elevation) * state.distance;
      camera.position.set(
        target.x + Math.cos(state.azimuth) * horizontal,
        target.y + Math.sin(state.azimuth) * horizontal,
        target.z + Math.sin(state.elevation) * state.distance
      );
      camera.up.set(0, 0, 1);
      camera.lookAt(target);
    }

    function pointerPos(evt) {
      if (evt.touches && evt.touches[0]) return { x: evt.touches[0].clientX, y: evt.touches[0].clientY };
      return { x: evt.clientX, y: evt.clientY };
    }

    function onPointerDown(evt) {
      const p = pointerPos(evt);
      state.dragging = true;
      state.lastX = p.x;
      state.lastY = p.y;
    }

    function onPointerMove(evt) {
      if (!state.dragging) return;
      const p = pointerPos(evt);
      const dx = p.x - state.lastX;
      const dy = p.y - state.lastY;
      state.azimuth -= dx * 0.006;
      state.elevation = Math.max(-0.15, Math.min(1.26, state.elevation + dy * 0.004));
      state.lastX = p.x;
      state.lastY = p.y;
      updateCamera();
    }

    function onPointerUp() {
      state.dragging = false;
    }

    function onWheel(evt) {
      evt.preventDefault();
      state.distance = Math.max(0.80, Math.min(5.0, state.distance + Math.sign(evt.deltaY) * 0.13));
      updateCamera();
    }

    domElement.addEventListener("mousedown", onPointerDown);
    domElement.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);
    domElement.addEventListener("touchstart", onPointerDown, { passive: true });
    domElement.addEventListener("touchmove", onPointerMove, { passive: true });
    window.addEventListener("touchend", onPointerUp);
    domElement.addEventListener("wheel", onWheel, { passive: false });

    updateCamera();
    return {
      state,
      target,
      update: updateCamera,
      dispose() {
        domElement.removeEventListener("mousedown", onPointerDown);
        domElement.removeEventListener("mousemove", onPointerMove);
        window.removeEventListener("mouseup", onPointerUp);
        domElement.removeEventListener("touchstart", onPointerDown);
        domElement.removeEventListener("touchmove", onPointerMove);
        window.removeEventListener("touchend", onPointerUp);
        domElement.removeEventListener("wheel", onWheel);
      }
    };
  }

  function createRavenViewer(THREE, mount, options = {}) {
    if (!THREE) throw new Error("Pass the THREE namespace: createRavenViewer(THREE, mount, options)");
    if (typeof document === "undefined") throw new Error("createRavenViewer requires a browser document");

    const host = mount || document.body;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(options.background || 0x111417);

    const camera = new THREE.PerspectiveCamera(46, 1, 0.01, 100);
    camera.up.set(0, 0, 1);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
    const maxPixelRatio = options.maxPixelRatio ?? 1.75;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xeaf4ff, 0x151719, 1.8);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 3.0);
    key.position.set(1.8, -2.2, 2.7);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x9ec5ff, 1.25);
    rim.position.set(-2.0, 1.5, 1.9);
    scene.add(rim);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 5),
      new THREE.MeshStandardMaterial({ color: 0x171b1d, roughness: 0.92, metalness: 0.05 })
    );
    ground.receiveShadow = true;
    ground.position.z = -0.012;
    scene.add(ground);

    const grid = new THREE.GridHelper(5, 25, 0x46515a, 0x272f35);
    grid.rotation.x = Math.PI / 2;
    grid.position.z = -0.010;
    grid.material.transparent = true;
    grid.material.opacity = 0.40;
    scene.add(grid);

    const asset = createRavenAirSurrogate(THREE, {
      showInternal: options.showInternal ?? true,
      showCollision: options.showCollision ?? false,
      ghostExterior: options.ghostExterior ?? false,
      showLabels: options.showLabels ?? true
    });
    scene.add(asset.group);

    const controls = installSimpleOrbitControls(THREE, camera, renderer.domElement);

    function resize() {
      const width = host.clientWidth || window.innerWidth;
      const height = host.clientHeight || window.innerHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    window.addEventListener("resize", resize);
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    if (resizeObserver) resizeObserver.observe(host);
    resize();

    let running = true;
    let autoRotateEnabled = Boolean(options.autoRotate);
    let propSpinEnabled = options.spinProp ?? true;
    let previousTimestamp = null;
    const maxDeltaSeconds = 0.05;
    const fallbackDeltaSeconds = 1 / 60;
    const autoRotateRadiansPerSecond = options.autoRotateRadiansPerSecond ?? 0.18;
    const propSpinRadiansPerSecond = options.propSpinRadiansPerSecond ?? 18.0;

    function animationDeltaSeconds(timestamp) {
      const now = Number.isFinite(timestamp)
        ? timestamp
        : (typeof performance !== "undefined" ? performance.now() : Date.now());
      if (previousTimestamp === null) {
        previousTimestamp = now;
        return fallbackDeltaSeconds;
      }
      const delta = Math.max(0, (now - previousTimestamp) / 1000);
      previousTimestamp = now;
      return Math.min(delta || fallbackDeltaSeconds, maxDeltaSeconds);
    }

    function animate(timestamp) {
      if (!running) return;
      const deltaSeconds = animationDeltaSeconds(timestamp);
      if (autoRotateEnabled) {
        controls.state.azimuth -= autoRotateRadiansPerSecond * deltaSeconds;
        controls.update();
      }
      const prop = asset.group.getObjectByName("animated_two_blade_propeller");
      if (prop && propSpinEnabled) {
        prop.rotation.x = (prop.rotation.x + propSpinRadiansPerSecond * deltaSeconds) % (Math.PI * 2);
      }
      renderer.render(scene, camera);
    }

    renderer.setAnimationLoop(animate);

    function resetAnimationClock() {
      previousTimestamp = null;
    }

    document.addEventListener("visibilitychange", resetAnimationClock);

    return {
      scene,
      camera,
      renderer,
      controls,
      ...asset,
      setInternalVisible(visible) {
        asset.internalGroup.visible = Boolean(visible);
      },
      setCollisionVisible(visible) {
        asset.collisionGroup.visible = Boolean(visible);
      },
      setAutoRotate(enabled) {
        autoRotateEnabled = Boolean(enabled);
      },
      setPropSpin(enabled) {
        propSpinEnabled = Boolean(enabled);
      },
      dispose() {
        running = false;
        renderer.setAnimationLoop(null);
        window.removeEventListener("resize", resize);
        if (resizeObserver) resizeObserver.disconnect();
        document.removeEventListener("visibilitychange", resetAnimationClock);
        controls.dispose();
        renderer.dispose();
        if (renderer.domElement.parentElement) renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }

  return {
    RAVEN_PHYSICS_METADATA,
    createRavenAirSurrogate,
    createRavenViewer
  };
});
