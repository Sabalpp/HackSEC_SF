/*
  Teledyne FLIR Centaur land UGV public-reference surrogate, all-in-one Three.js file.

  Usage in browser after loading Three.js:
    const { group, collisionGroup, metadata } =
      CentaurLandThreeJS.createCentaurLandSurrogate(THREE, {
        showInternal: true,
        showCollision: false,
        ghostExterior: false,
        showLabels: true
      });
    scene.add(group);

  Optional full viewer:
    CentaurLandThreeJS.createCentaurViewer(THREE, document.body);

  This is a non-operational visual and simulation surrogate. Internal zones are fictional
  environmental stress volumes, not real hidden component placement.
*/

(function attachCentaurLandThreeJS(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CentaurLandThreeJS = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function buildApi() {
  "use strict";

  const CENTAUR_PHYSICS_METADATA = Object.freeze({
    asset_id: "teledyne_flir_centaur_land_public_surrogate",
    display_name: "Teledyne FLIR Centaur land UGV public-reference surrogate",
    classification: "non-operational CAD surrogate",
    units: "meters",
    source_basis: {
      public_points_used: [
        "medium-sized, IOP-compliant remotely operated UGV",
        "approximately 160 lb public reported mass",
        "EO/IR camera suite on visible mast/head",
        "manipulator arm reach publicly described as 75.5 inches or over six feet",
        "publicly described 6 inch obstacle/stair capability and 30 degree slope traversal",
        "exterior proportions inferred from public product imagery"
      ],
      not_used: [
        "no hidden interior placement",
        "no real armor or vulnerability geometry",
        "no exact wiring, fuel, battery, explosive, or sensitive system routing",
        "no classified or access-controlled datasheet content"
      ]
    },
    approximate_overall_dimensions_m: {
      visual_model_length_with_arm_extended: 2.23,
      base_length: 1.05,
      base_width: 0.79,
      base_height: 0.52,
      camera_mast_height: 1.34,
      manipulator_reach: 1.92
    },
    mass_properties: {
      mass_kg: 72.6,
      center_of_mass_m_stowed_estimate: [0.02, 0.0, 0.37],
      center_of_mass_m_arm_extended_estimate: [0.27, 0.0, 0.42],
      inertia_tensor_kg_m2_estimate: { ixx: 6.4, iyy: 12.8, izz: 10.9 },
      confidence: "low-to-medium; mass is public, inertia and COM are simulator approximations"
    },
    coordinate_frame: {
      origin: "center of base footprint at ground plane",
      x_axis: "forward toward manipulator reach",
      y_axis: "left/right across tracks",
      z_axis: "up"
    },
    collision_primitives: [
      { name: "main_chassis", type: "box", center_m: [0.0, 0.0, 0.335], size_m: [0.98, 0.65, 0.28] },
      { name: "left_track_pod", type: "box", center_m: [0.0, 0.33, 0.205], size_m: [1.04, 0.15, 0.205] },
      { name: "right_track_pod", type: "box", center_m: [0.0, -0.33, 0.205], size_m: [1.04, 0.15, 0.205] },
      { name: "arm_swept_volume_extended", type: "box", center_m: [0.70, 0.0, 0.835], size_m: [2.0, 0.18, 0.46] },
      { name: "camera_mast", type: "capsule", point_a_m: [-0.35, 0.185, 0.52], point_b_m: [-0.35, 0.185, 1.34], radius_m: 0.075 }
    ],
    mobility_surrogate: {
      drive_type: "tracked differential drive",
      track_contact_patches_m: [
        { name: "left_track_contact", center_m: [0.0, 0.33, 0.06], size_m: [0.98, 0.13, 0.05] },
        { name: "right_track_contact", center_m: [0.0, -0.33, 0.06], size_m: [0.98, 0.13, 0.05] }
      ],
      public_capability_points: { obstacle_height_m: 0.1524, slope_angle_deg: 30 },
      simulator_defaults: {
        max_speed_mps: 1.12,
        ground_clearance_m: 0.08,
        track_friction_nominal: 0.82,
        track_friction_dusty: 0.64,
        track_friction_icy: 0.28
      }
    },
    visible_external_subsystems: [
      {
        name: "eo_ir_camera_head",
        zone: "rear mast top",
        environmental_failure_modes: ["dust_occlusion", "humidity_condensation", "thermal_noise", "uv_seal_aging"]
      },
      {
        name: "manipulator_arm",
        zone: "top deck forward reach",
        environmental_failure_modes: ["joint_seal_wear", "cold_lubricant_stiffening", "dust_joint_ingestion", "thermal_derating"]
      },
      {
        name: "tracked_running_gear",
        zone: "left and right lower hull",
        environmental_failure_modes: ["mud_packing", "sand_abrasion", "ice_buildup", "rubber_uv_aging"]
      },
      {
        name: "payload_mounting_area",
        zone: "top deck",
        environmental_failure_modes: ["connector_corrosion", "thermal_cycle_fatigue", "dust_connector_fouling"]
      }
    ],
    surrogate_internal_zones: [
      {
        name: "battery_zone",
        center_m: [-0.095, 0.0, 0.35],
        size_m: [0.26, 0.33, 0.096],
        purpose: "environmental degradation model only",
        failure_modes: ["cold_capacity_loss", "heat_accelerated_aging", "humidity_connector_corrosion"]
      },
      {
        name: "compute_power_zone",
        center_m: [0.25, 0.0, 0.355],
        size_m: [0.23, 0.19, 0.09],
        purpose: "environmental degradation model only",
        failure_modes: ["thermal_derating", "humidity_corrosion", "dust_fan_fouling"]
      },
      {
        name: "cooling_filter_zone",
        center_m: [-0.36, 0.0, 0.36],
        size_m: [0.135, 0.23, 0.085],
        purpose: "environmental degradation model only",
        failure_modes: ["dust_clogging", "salt_fog_corrosion", "thermal_load_margin_loss"]
      },
      {
        name: "drive_module_zones",
        center_m: [0.39, 0.0, 0.397],
        size_m: [0.095, 0.30, 0.070],
        purpose: "environmental degradation model only",
        failure_modes: ["thermal_derating", "cold_grease_stiffening", "dust_seal_wear"]
      },
      {
        name: "arm_actuator_zone",
        center_m: [-0.205, 0.0, 0.48],
        size_m: [0.15, 0.132, 0.042],
        purpose: "environmental degradation model only",
        failure_modes: ["cold_actuator_sluggishness", "dust_joint_ingestion", "uv_hose_jacket_aging"]
      },
      {
        name: "sensor_electronics_zone",
        center_m: [-0.35, 0.185, 0.955],
        size_m: [0.07, 0.06, 0.20],
        purpose: "environmental degradation model only",
        failure_modes: ["humidity_condensation", "heat_noise_floor_increase", "dust_lens_occlusion"]
      }
    ],
    environmental_stress_coefficients_demo_only: {
      extreme_heat_middle_east: {
        battery_zone: 1.18,
        compute_power_zone: 1.45,
        cooling_filter_zone: 1.55,
        drive_module_zones: 1.35,
        arm_actuator_zone: 1.22,
        sensor_electronics_zone: 1.40
      },
      dust_desert: {
        battery_zone: 1.08,
        compute_power_zone: 1.32,
        cooling_filter_zone: 1.80,
        drive_module_zones: 1.55,
        arm_actuator_zone: 1.62,
        sensor_electronics_zone: 1.50
      },
      extreme_cold_eastern_europe: {
        battery_zone: 1.78,
        compute_power_zone: 1.12,
        cooling_filter_zone: 1.15,
        drive_module_zones: 1.42,
        arm_actuator_zone: 1.50,
        sensor_electronics_zone: 1.18
      },
      humidity_maritime: {
        battery_zone: 1.22,
        compute_power_zone: 1.36,
        cooling_filter_zone: 1.30,
        drive_module_zones: 1.18,
        arm_actuator_zone: 1.25,
        sensor_electronics_zone: 1.52
      },
      high_uv_desert: {
        battery_zone: 1.05,
        compute_power_zone: 1.08,
        cooling_filter_zone: 1.14,
        drive_module_zones: 1.22,
        arm_actuator_zone: 1.34,
        sensor_electronics_zone: 1.16
      }
    }
  });

  const COLORS = Object.freeze({
    body: 0x0e0f10,
    panel: 0x202329,
    rubber: 0x050505,
    metal: 0x676962,
    glass: 0x12333a,
    yellow: 0xe5a819,
    red: 0xc80f0a,
    internalBattery: 0x1d5cff,
    internalCompute: 0x34b75a,
    internalFilter: 0xf06322,
    internalHydraulic: 0x8c36c9,
    collision: 0x2d9cff,
    label: 0xe8eef2
  });

  function v3(THREE, p) {
    return new THREE.Vector3(p[0], p[1], p[2]);
  }

  function makeMaterials(THREE, options) {
    const ghostExterior = Boolean(options.ghostExterior && options.showInternal);
    const exteriorOpacity = ghostExterior ? 0.42 : 1.0;
    const exteriorTransparent = ghostExterior;

    const standard = (color, roughness = 0.72, metalness = 0.16, opacity = 1.0) =>
      new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness,
        transparent: opacity < 1,
        opacity
      });

    return {
      body: standard(COLORS.body, 0.84, 0.12, exteriorOpacity),
      panel: standard(COLORS.panel, 0.68, 0.22, exteriorOpacity),
      rubber: standard(COLORS.rubber, 0.94, 0.02, exteriorOpacity),
      metal: standard(COLORS.metal, 0.46, 0.62, exteriorOpacity),
      glass: new THREE.MeshPhysicalMaterial({
        color: COLORS.glass,
        roughness: 0.18,
        metalness: 0.0,
        transmission: 0.0,
        transparent: exteriorTransparent,
        opacity: exteriorOpacity
      }),
      yellow: standard(COLORS.yellow, 0.54, 0.24, exteriorOpacity),
      red: standard(COLORS.red, 0.56, 0.14, exteriorOpacity),
      internalBattery: standard(COLORS.internalBattery, 0.48, 0.18, 0.62),
      internalCompute: standard(COLORS.internalCompute, 0.48, 0.18, 0.58),
      internalFilter: standard(COLORS.internalFilter, 0.48, 0.18, 0.58),
      internalHydraulic: standard(COLORS.internalHydraulic, 0.48, 0.18, 0.58),
      collision: new THREE.MeshBasicMaterial({
        color: COLORS.collision,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        wireframe: true
      }),
      contact: new THREE.MeshBasicMaterial({
        color: 0x58ff88,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
        wireframe: true
      })
    };
  }

  function addNamed(parent, child, name) {
    child.name = name;
    parent.add(child);
    return child;
  }

  function makeBox(THREE, materials, center, size, materialName, name) {
    const geom = new THREE.BoxGeometry(size[0], size[1], size[2]);
    const mesh = new THREE.Mesh(geom, materials[materialName]);
    mesh.position.set(center[0], center[1], center[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.size_m = size.slice();
    mesh.userData.center_m = center.slice();
    if (name) mesh.name = name;
    return mesh;
  }

  function makeCylinder(THREE, materials, center, radius, length, axis, materialName, name, radialSegments = 32) {
    const geom = new THREE.CylinderGeometry(radius, radius, length, radialSegments, 1, false);
    const mesh = new THREE.Mesh(geom, materials[materialName]);
    mesh.position.set(center[0], center[1], center[2]);
    if (axis === "x") mesh.rotation.z = Math.PI / 2;
    if (axis === "z") mesh.rotation.x = Math.PI / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (name) mesh.name = name;
    return mesh;
  }

  function makeCylinderBetween(THREE, materials, pointA, pointB, radius, materialName, name, radialSegments = 24) {
    const a = v3(THREE, pointA);
    const b = v3(THREE, pointB);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const length = a.distanceTo(b);
    const geom = new THREE.CylinderGeometry(radius, radius, length, radialSegments, 1, false);
    const mesh = new THREE.Mesh(geom, materials[materialName]);
    mesh.position.copy(mid);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (name) mesh.name = name;
    return mesh;
  }

  function makeWheel(THREE, materials, x, y, z, radius, width, hub, name) {
    const wheel = new THREE.Group();
    wheel.name = name;
    wheel.add(makeCylinder(THREE, materials, [x, y, z], radius, width, "y", "rubber", `${name}_tire`, 36));
    wheel.add(makeCylinder(THREE, materials, [x, y + Math.sign(y) * 0.003, z], radius * 0.74, width + 0.004, "y", "panel", `${name}_rim`, 36));
    wheel.add(makeCylinder(THREE, materials, [x, y + Math.sign(y) * 0.006, z], hub, width + 0.008, "y", "metal", `${name}_hub`, 24));
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
      wheel.add(makeCylinder(
        THREE,
        materials,
        [x + Math.cos(a) * radius * 0.5, y + Math.sign(y) * 0.028, z + Math.sin(a) * radius * 0.5],
        0.004,
        0.008,
        "y",
        "metal",
        `${name}_bolt`
      ));
    }
    return wheel;
  }

  function addTrackSide(THREE, materials, parent, side) {
    const y = side * 0.33;
    const track = new THREE.Group();
    track.name = side > 0 ? "left_track_assembly" : "right_track_assembly";

    track.add(makeBox(THREE, materials, [0, y, 0.205], [1.04, 0.132, 0.205], "rubber", "track_belt_volume"));
    track.add(makeWheel(THREE, materials, -0.420, y, 0.205, 0.084, 0.058, 0.028, "front_idler"));
    track.add(makeWheel(THREE, materials, -0.170, y, 0.205, 0.090, 0.058, 0.031, "road_wheel_1"));
    track.add(makeWheel(THREE, materials, 0.110, y, 0.205, 0.090, 0.058, 0.031, "road_wheel_2"));
    track.add(makeWheel(THREE, materials, 0.390, y, 0.205, 0.084, 0.058, 0.028, "rear_idler"));
    track.add(makeWheel(THREE, materials, -0.300, y, 0.302, 0.042, 0.042, 0.018, "upper_return_roller_front"));
    track.add(makeWheel(THREE, materials, 0.260, y, 0.302, 0.042, 0.042, 0.018, "upper_return_roller_rear"));

    for (let x = -0.485; x <= 0.485; x += 0.082) {
      track.add(makeBox(THREE, materials, [x, y, 0.318], [0.048, 0.148, 0.026], "rubber", "upper_tread_block"));
      track.add(makeBox(THREE, materials, [x, y, 0.092], [0.052, 0.148, 0.028], "rubber", "lower_tread_block"));
    }

    [-0.515, 0.515].forEach(x => {
      track.add(makeBox(THREE, materials, [x, y, 0.205], [0.025, 0.150, 0.180], "panel", "track_end_guard"));
    });

    for (let x = -0.480; x <= 0.480; x += 0.120) {
      track.add(makeBox(THREE, materials, [x, side * 0.404, 0.095], [0.042, 0.022, 0.045], "rubber", "outer_lower_grouser"));
      track.add(makeBox(THREE, materials, [x, side * 0.404, 0.310], [0.042, 0.022, 0.038], "rubber", "outer_upper_grouser"));
    }

    parent.add(track);
  }

  function addChassis(THREE, materials, parent) {
    addNamed(parent, makeBox(THREE, materials, [0, 0, 0.335], [0.910, 0.485, 0.200], "body"), "main_hull");
    addNamed(parent, makeBox(THREE, materials, [0.035, 0, 0.445], [0.760, 0.420, 0.044], "panel"), "upper_deck");
    addNamed(parent, makeBox(THREE, materials, [-0.340, 0, 0.452], [0.170, 0.370, 0.046], "panel"), "rear_service_deck");
    addNamed(parent, makeBox(THREE, materials, [0.360, 0, 0.452], [0.180, 0.360, 0.042], "panel"), "front_service_deck");
    addNamed(parent, makeBox(THREE, materials, [-0.485, 0, 0.334], [0.036, 0.420, 0.145], "panel"), "rear_armor_plate");
    addNamed(parent, makeBox(THREE, materials, [0.490, 0, 0.334], [0.036, 0.420, 0.145], "panel"), "front_armor_plate");

    [-0.270, -0.090, 0.090, 0.270].forEach((x, i) => {
      addNamed(parent, makeBox(THREE, materials, [x, 0, 0.481], [0.126, 0.360, 0.010], "panel"), `top_service_panel_${i + 1}`);
    });

    for (let x = -0.390; x <= 0.420; x += 0.090) {
      parent.add(makeCylinder(THREE, materials, [x, 0.252, 0.410], 0.005, 0.009, "y", "metal", "side_bolt"));
      parent.add(makeCylinder(THREE, materials, [x, -0.252, 0.410], 0.005, 0.009, "y", "metal", "side_bolt"));
    }

    for (let x = -0.390; x <= 0.390; x += 0.078) {
      parent.add(makeBox(THREE, materials, [x, 0.263, 0.340], [0.027, 0.012, 0.018], "metal", "side_latch"));
      parent.add(makeBox(THREE, materials, [x, -0.263, 0.340], [0.027, 0.012, 0.018], "metal", "side_latch"));
    }

    [-0.250, -0.200, -0.150, -0.100, -0.050, 0].forEach(x => {
      parent.add(makeBox(THREE, materials, [x, -0.247, 0.453], [0.024, 0.018, 0.018], "metal", "connector_port"));
    });

    parent.add(makeBox(THREE, materials, [0.205, 0, 0.507], [0.235, 0.220, 0.050], "panel", "front_payload_mount"));
    parent.add(makeBox(THREE, materials, [-0.120, 0, 0.508], [0.260, 0.210, 0.045], "panel", "arm_base_mount"));
    parent.add(makeBox(THREE, materials, [0.410, -0.175, 0.505], [0.092, 0.056, 0.046], "panel", "right_payload_socket"));
    parent.add(makeBox(THREE, materials, [0.415, 0.175, 0.505], [0.092, 0.056, 0.046], "panel", "left_payload_socket"));
  }

  function addMastAndCamera(THREE, materials, parent) {
    const mast = new THREE.Group();
    mast.name = "mast_camera_and_rear_frame";

    mast.add(makeCylinder(THREE, materials, [-0.350, 0.185, 0.845], 0.028, 0.650, "z", "panel", "sensor_mast"));
    mast.add(makeCylinder(THREE, materials, [-0.350, 0.185, 0.520], 0.048, 0.046, "z", "panel", "mast_base"));
    mast.add(makeCylinder(THREE, materials, [-0.350, 0.185, 1.175], 0.040, 0.044, "z", "panel", "pan_tilt_joint"));
    mast.add(makeBox(THREE, materials, [-0.350, 0.185, 1.275], [0.205, 0.120, 0.105], "panel", "eo_ir_camera_head"));
    mast.add(makeBox(THREE, materials, [-0.350, 0.185, 1.338], [0.185, 0.102, 0.022], "body", "camera_sunshade"));
    mast.add(makeCylinder(THREE, materials, [-0.458, 0.158, 1.288], 0.030, 0.008, "x", "glass", "visible_optical_lens"));
    mast.add(makeCylinder(THREE, materials, [-0.458, 0.212, 1.288], 0.022, 0.008, "x", "glass", "thermal_lens"));
    mast.add(makeBox(THREE, materials, [-0.450, 0.185, 1.235], [0.016, 0.088, 0.020], "metal", "camera_front_plate"));

    mast.add(makeCylinderBetween(THREE, materials, [-0.485, 0.265, 0.505], [-0.485, 0.265, 0.955], 0.013, "panel", "rear_guard_left"));
    mast.add(makeCylinderBetween(THREE, materials, [-0.485, 0.265, 0.955], [-0.350, 0.245, 0.955], 0.013, "panel", "rear_guard_top"));
    mast.add(makeCylinderBetween(THREE, materials, [-0.470, -0.250, 0.506], [-0.470, -0.250, 0.725], 0.013, "panel", "rear_guard_right"));
    mast.add(makeCylinderBetween(THREE, materials, [-0.470, -0.250, 0.725], [-0.375, -0.210, 0.758], 0.013, "panel", "rear_guard_diagonal"));
    mast.add(makeCylinderBetween(THREE, materials, [-0.375, -0.210, 0.758], [-0.350, 0.185, 0.758], 0.013, "panel", "rear_guard_crossbar"));

    mast.add(makeCylinder(THREE, materials, [-0.245, -0.180, 0.570], 0.092, 0.086, "y", "yellow", "cable_reel"));
    mast.add(makeCylinder(THREE, materials, [-0.245, -0.232, 0.570], 0.101, 0.012, "y", "panel", "cable_reel_outer_flange"));
    mast.add(makeCylinder(THREE, materials, [-0.245, -0.128, 0.570], 0.101, 0.012, "y", "panel", "cable_reel_inner_flange"));

    parent.add(mast);
  }

  function addManipulatorArm(THREE, materials, parent) {
    const arm = new THREE.Group();
    arm.name = "five_dof_visual_manipulator_arm";

    arm.add(makeCylinder(THREE, materials, [-0.210, 0, 0.532], 0.092, 0.068, "z", "panel", "arm_turntable"));
    arm.add(makeCylinder(THREE, materials, [-0.210, 0, 0.605], 0.064, 0.092, "y", "panel", "shoulder_joint"));
    arm.add(makeCylinderBetween(THREE, materials, [-0.165, 0, 0.610], [0.540, 0, 0.990], 0.036, "panel", "upper_arm_link"));
    arm.add(makeCylinderBetween(THREE, materials, [-0.165, 0.056, 0.595], [0.540, 0.056, 0.975], 0.017, "body", "upper_arm_side_rail_left"));
    arm.add(makeCylinderBetween(THREE, materials, [-0.165, -0.056, 0.595], [0.540, -0.056, 0.975], 0.017, "body", "upper_arm_side_rail_right"));
    arm.add(makeCylinder(THREE, materials, [0.540, 0, 0.990], 0.078, 0.098, "y", "panel", "elbow_joint"));
    arm.add(makeCylinderBetween(THREE, materials, [0.600, 0, 0.965], [1.240, 0, 0.810], 0.034, "panel", "forearm_link"));
    arm.add(makeCylinderBetween(THREE, materials, [0.600, 0.055, 0.950], [1.240, 0.055, 0.795], 0.014, "body", "forearm_side_rail_left"));
    arm.add(makeCylinderBetween(THREE, materials, [0.600, -0.055, 0.950], [1.240, -0.055, 0.795], 0.014, "body", "forearm_side_rail_right"));
    arm.add(makeCylinder(THREE, materials, [1.240, 0, 0.810], 0.055, 0.080, "y", "panel", "wrist_joint"));
    arm.add(makeCylinderBetween(THREE, materials, [1.280, 0, 0.805], [1.420, 0, 0.790], 0.026, "panel", "wrist_extension"));

    arm.add(makeBox(THREE, materials, [1.420, 0, 0.790], [0.145, 0.086, 0.074], "panel", "gripper_body"));
    arm.add(makeCylinder(THREE, materials, [1.510, 0.034, 0.790], 0.018, 0.126, "x", "metal", "upper_finger_hinge"));
    arm.add(makeCylinder(THREE, materials, [1.510, -0.034, 0.790], 0.018, 0.126, "x", "metal", "lower_finger_hinge"));
    arm.add(makeBox(THREE, materials, [1.585, 0.050, 0.815], [0.168, 0.024, 0.030], "metal", "upper_gripper_finger"));
    arm.add(makeBox(THREE, materials, [1.585, -0.050, 0.765], [0.168, 0.024, 0.030], "metal", "lower_gripper_finger"));
    arm.add(makeBox(THREE, materials, [1.687, 0.053, 0.828], [0.030, 0.034, 0.032], "red", "upper_gripper_pad"));
    arm.add(makeBox(THREE, materials, [1.687, -0.053, 0.752], [0.030, 0.034, 0.032], "red", "lower_gripper_pad"));

    [1.465, 1.530, 1.595].forEach(x => {
      arm.add(makeCylinder(THREE, materials, [x, 0.053, 0.815], 0.006, 0.031, "y", "body", "upper_finger_bolt"));
      arm.add(makeCylinder(THREE, materials, [x, -0.053, 0.765], 0.006, 0.031, "y", "body", "lower_finger_bolt"));
    });

    arm.add(makeCylinderBetween(THREE, materials, [-0.190, 0.078, 0.640], [0.540, 0.078, 1.025], 0.007, "rubber", "arm_cable_bundle_upper"));
    arm.add(makeCylinderBetween(THREE, materials, [0.540, 0.078, 1.025], [1.275, 0.078, 0.845], 0.007, "rubber", "arm_cable_bundle_forearm"));

    parent.add(arm);
  }

  function makeLabelSprite(THREE, text) {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 512;
    canvas.height = 128;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(10, 12, 14, 0.76)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(232, 238, 242, 0.85)";
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
    ctx.font = "600 42px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.fillStyle = "rgba(232, 238, 242, 0.96)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text.replace(/_/g, " "), canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.34, 0.085, 1);
    sprite.name = `label_${text}`;
    return sprite;
  }

  function addInternalSurrogates(THREE, materials, parent, options) {
    const internal = new THREE.Group();
    internal.name = "surrogate_internal_environmental_zones";
    internal.visible = options.showInternal !== false;

    const zones = [
      { name: "battery_zone_left", center: [-0.095, -0.098, 0.350], size: [0.260, 0.132, 0.096], mat: "internalBattery", label: "battery zone" },
      { name: "battery_zone_right", center: [-0.095, 0.098, 0.350], size: [0.260, 0.132, 0.096], mat: "internalBattery" },
      { name: "compute_power_zone", center: [0.250, 0, 0.355], size: [0.230, 0.190, 0.090], mat: "internalCompute", label: "compute / power" },
      { name: "cooling_filter_zone", center: [-0.360, 0, 0.360], size: [0.135, 0.230, 0.085], mat: "internalFilter", label: "cooling / filter" },
      { name: "cable_payload_bus", center: [0.045, 0, 0.432], size: [0.190, 0.164, 0.048], mat: "yellow", label: "payload bus" },
      { name: "left_drive_module_zone", center: [0.390, 0.150, 0.397], size: [0.095, 0.090, 0.070], mat: "red", label: "drive module" },
      { name: "right_drive_module_zone", center: [0.390, -0.150, 0.397], size: [0.095, 0.090, 0.070], mat: "red" },
      { name: "arm_actuator_zone", center: [-0.205, 0, 0.480], size: [0.150, 0.132, 0.042], mat: "internalHydraulic", label: "arm actuator" },
      { name: "sensor_electronics_zone", center: [-0.350, 0.185, 0.955], size: [0.070, 0.060, 0.200], mat: "glass", label: "sensor electronics" }
    ];

    zones.forEach(zone => {
      const mesh = makeBox(THREE, materials, zone.center, zone.size, zone.mat, zone.name);
      mesh.userData.zone = zone.name;
      mesh.userData.nonOperationalSurrogate = true;
      internal.add(mesh);
      if (options.showLabels && zone.label) {
        const label = makeLabelSprite(THREE, zone.label);
        if (label) {
          label.position.set(zone.center[0], zone.center[1], zone.center[2] + zone.size[2] / 2 + 0.065);
          internal.add(label);
        }
      }
    });

    parent.add(internal);
    return internal;
  }

  function createCollisionGroup(THREE, materials, metadata) {
    const collision = new THREE.Group();
    collision.name = "centaur_collision_primitives";

    metadata.collision_primitives.forEach(primitive => {
      if (primitive.type === "box") {
        const mesh = makeBox(THREE, materials, primitive.center_m, primitive.size_m, "collision", `collision_${primitive.name}`);
        mesh.userData.physicsPrimitive = primitive;
        collision.add(mesh);
      } else if (primitive.type === "capsule") {
        const mesh = makeCylinderBetween(
          THREE,
          materials,
          primitive.point_a_m,
          primitive.point_b_m,
          primitive.radius_m,
          "collision",
          `collision_${primitive.name}`,
          16
        );
        mesh.userData.physicsPrimitive = primitive;
        collision.add(mesh);
      }
    });

    metadata.mobility_surrogate.track_contact_patches_m.forEach(patch => {
      const mesh = makeBox(THREE, materials, patch.center_m, patch.size_m, "contact", `contact_${patch.name}`);
      mesh.userData.physicsContactPatch = patch;
      collision.add(mesh);
    });

    return collision;
  }

  function createCentaurLandSurrogate(THREE, options = {}) {
    if (!THREE) throw new Error("Pass the THREE namespace: createCentaurLandSurrogate(THREE, options)");

    const settings = {
      showInternal: true,
      showCollision: false,
      ghostExterior: false,
      showLabels: true,
      ...options
    };

    const materials = makeMaterials(THREE, settings);
    const group = new THREE.Group();
    group.name = "teledyne_flir_centaur_land_public_surrogate";
    group.userData.metadata = CENTAUR_PHYSICS_METADATA;

    const exterior = new THREE.Group();
    exterior.name = "exterior_public_reference_visual";
    addTrackSide(THREE, materials, exterior, 1);
    addTrackSide(THREE, materials, exterior, -1);
    addChassis(THREE, materials, exterior);
    addMastAndCamera(THREE, materials, exterior);
    addManipulatorArm(THREE, materials, exterior);
    group.add(exterior);

    const internalGroup = addInternalSurrogates(THREE, materials, group, settings);
    const collisionGroup = createCollisionGroup(THREE, materials, CENTAUR_PHYSICS_METADATA);
    collisionGroup.visible = Boolean(settings.showCollision);
    group.add(collisionGroup);

    const centerOfMass = makeCylinder(THREE, materials, CENTAUR_PHYSICS_METADATA.mass_properties.center_of_mass_m_arm_extended_estimate, 0.025, 0.006, "z", "yellow", "center_of_mass_marker");
    centerOfMass.userData.centerOfMass = true;
    group.add(centerOfMass);

    return {
      group,
      exterior,
      internalGroup,
      collisionGroup,
      materials,
      metadata: CENTAUR_PHYSICS_METADATA
    };
  }

  function installSimpleOrbitControls(THREE, camera, domElement, target = new THREE.Vector3(0.32, 0, 0.56)) {
    const state = {
      azimuth: -0.78,
      elevation: 0.38,
      distance: 3.35,
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
      state.elevation = Math.max(-0.10, Math.min(1.22, state.elevation + dy * 0.004));
      state.lastX = p.x;
      state.lastY = p.y;
      updateCamera();
    }

    function onPointerUp() {
      state.dragging = false;
    }

    function onWheel(evt) {
      evt.preventDefault();
      state.distance = Math.max(1.35, Math.min(7.0, state.distance + Math.sign(evt.deltaY) * 0.18));
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

  function createCentaurViewer(THREE, mount, options = {}) {
    if (!THREE) throw new Error("Pass the THREE namespace: createCentaurViewer(THREE, mount, options)");
    if (typeof document === "undefined") throw new Error("createCentaurViewer requires a browser document");

    const host = mount || document.body;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(options.background || 0x101316);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
    camera.up.set(0, 0, 1);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const ambient = new THREE.HemisphereLight(0xdde8f0, 0x101214, 1.9);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 3.0);
    key.position.set(1.7, -2.4, 3.6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x86a6ff, 1.35);
    rim.position.set(-2.2, 1.6, 2.4);
    scene.add(rim);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 8),
      new THREE.MeshStandardMaterial({ color: 0x171b1f, roughness: 0.92, metalness: 0.05 })
    );
    ground.name = "matte_ground_plane";
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(8, 32, 0x34404a, 0x242b31);
    grid.rotation.x = Math.PI / 2;
    grid.material.transparent = true;
    grid.material.opacity = 0.42;
    scene.add(grid);

    const asset = createCentaurLandSurrogate(THREE, {
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
    resize();

    let animationFrame = 0;
    let running = true;
    let autoRotateEnabled = Boolean(options.autoRotate);
    function animate() {
      if (!running) return;
      animationFrame = window.requestAnimationFrame(animate);
      if (autoRotateEnabled) {
        controls.state.azimuth -= 0.003;
        controls.update();
      }
      renderer.render(scene, camera);
    }
    animate();

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
      dispose() {
        running = false;
        if (animationFrame) window.cancelAnimationFrame(animationFrame);
        window.removeEventListener("resize", resize);
        controls.dispose();
        renderer.dispose();
        if (renderer.domElement.parentElement) renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }

  return {
    CENTAUR_PHYSICS_METADATA,
    createCentaurLandSurrogate,
    createCentaurViewer
  };
});
