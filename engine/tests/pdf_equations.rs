use engine::*;

fn approx(left: f64, right: f64) {
    assert!((left - right).abs() < 1e-9, "left={left}, right={right}");
}

fn test_properties() -> VehicleProperties {
    VehicleProperties {
        material_grade: MaterialGrade::MildSteelTemperate,
        material_profile: MaterialGrade::MildSteelTemperate.profile(),
        thresholds: EnvironmentalThresholds {
            engine_heat_c: 100.0,
            battery_heat_c: 100.0,
            hydraulics_heat_c: 100.0,
            engine_cold_c: Some(0.0),
            battery_cold_c: Some(0.0),
            hydraulics_cold_c: Some(0.0),
            sensors_humidity: 0.4,
            chassis_humidity: 0.5,
        },
        coefficients: CoefficientMatrix {
            engine_heat: 0.01,
            engine_cold: 0.02,
            engine_dust: 0.03,
            battery_heat: 0.04,
            battery_cold: 0.05,
            battery_uv: 0.06,
            hydraulics_heat: 0.07,
            hydraulics_cold: 0.08,
            hydraulics_uv: 0.09,
            sensors_dust: 0.10,
            sensors_humidity: 0.11,
            sensors_uv: 0.12,
            chassis_humidity: 0.13,
            chassis_salinity: 0.14,
        },
    }
}

#[test]
fn initial_health_is_one_for_all_subsystems() {
    let state = VehicleState::default();

    approx(state.subsystems.engine, 1.0);
    approx(state.subsystems.battery, 1.0);
    approx(state.subsystems.hydraulics, 1.0);
    approx(state.subsystems.sensors, 1.0);
    approx(state.subsystems.chassis, 1.0);
    approx(state.components.chassis_frame, 1.0);
    approx(state.components.chassis_plating, 1.0);
    approx(state.components.chassis_suspension, 1.0);
    approx(state.components.chassis_underbelly, 1.0);
    approx(state.components.chassis_track_wheels, 1.0);
    approx(state.components.chassis_hatches_doors, 1.0);
    approx(state.components.sensors_thermal, 1.0);
    approx(state.components.sensors_radar, 1.0);
    approx(state.components.sensors_acoustic, 1.0);
    approx(state.components.sensors_gps, 1.0);
    approx(state.components.sensors_camera, 1.0);
    approx(state.vehicle_health, 1.0);
}

#[test]
fn vehicle_health_uses_pdf_weights() {
    let health = SubsystemHealth {
        engine: 0.5,
        battery: 0.6,
        hydraulics: 0.7,
        sensors: 0.8,
        chassis: 0.9,
    };

    approx(
        health.vehicle_health(),
        (4.0 / 13.0) * 0.5
            + (3.0 / 13.0) * 0.6
            + (3.0 / 13.0) * 0.7
            + (1.0 / 13.0) * 0.8
            + (2.0 / 13.0) * 0.9,
    );
}

#[test]
fn heat_only_affects_engine_battery_and_hydraulics_above_threshold() {
    let properties = test_properties();
    let derivatives = extreme_heat(&properties, 110.0);

    approx(derivatives.engine, -0.10);
    approx(derivatives.battery, -0.40);
    approx(derivatives.hydraulics, -0.70);
    approx(derivatives.sensors, 0.0);
    approx(derivatives.chassis, 0.0);
}

#[test]
fn cold_only_affects_engine_battery_and_hydraulics_below_threshold() {
    let properties = test_properties();
    let derivatives = extreme_cold(&properties, -10.0);

    approx(derivatives.engine, -0.20);
    approx(derivatives.battery, -0.50);
    approx(derivatives.hydraulics, -0.80);
    approx(derivatives.sensors, 0.0);
    approx(derivatives.chassis, 0.0);
}

#[test]
fn dust_affects_engine_and_sensors_linearly() {
    let properties = test_properties();
    let derivatives = dust_ingestion(&properties, 2.0);

    approx(derivatives.engine, -0.06);
    approx(derivatives.battery, 0.0);
    approx(derivatives.hydraulics, 0.0);
    approx(derivatives.sensors, -0.20);
    approx(derivatives.chassis, 0.0);
}

#[test]
fn humidity_uses_sensor_and_chassis_thresholds() {
    let properties = test_properties();
    let derivatives = humidity(&properties, 0.7);

    approx(derivatives.engine, 0.0);
    approx(derivatives.battery, 0.0);
    approx(derivatives.hydraulics, 0.0);
    approx(derivatives.sensors, -0.033);
    approx(derivatives.chassis, -0.026);
}

#[test]
fn salinity_affects_chassis_quadratically() {
    let properties = test_properties();
    let derivatives = salinity(&properties, 3.0);

    approx(derivatives.engine, 0.0);
    approx(derivatives.battery, 0.0);
    approx(derivatives.hydraulics, 0.0);
    approx(derivatives.sensors, 0.0);
    approx(derivatives.chassis, -1.26);
}

#[test]
fn uv_affects_sensors_hydraulics_and_battery() {
    let properties = test_properties();
    let derivatives = uv_solar_radiation(&properties, 2.0);

    approx(derivatives.engine, 0.0);
    approx(derivatives.battery, -0.24);
    approx(derivatives.hydraulics, -0.18);
    approx(derivatives.sensors, -0.24);
    approx(derivatives.chassis, 0.0);
}

#[test]
fn integration_clamps_health_to_pdf_range() {
    let mut health = SubsystemHealth::default();
    health.apply_derivatives(
        HealthDerivatives {
            engine: -2.0,
            battery: 0.5,
            hydraulics: -0.25,
            sensors: -0.5,
            chassis: -0.75,
        },
        1.0,
    );

    approx(health.engine, 0.0);
    approx(health.battery, 1.0);
    approx(health.hydraulics, 0.75);
    approx(health.sensors, 0.5);
    approx(health.chassis, 0.25);
}

#[test]
fn exponential_parts_degrade_faster_as_they_weaken() {
    let contribution = EnvironmentalFactorContribution {
        id: "salinity",
        label: "Salinity",
        derivatives: HealthDerivatives {
            chassis: -0.2,
            ..HealthDerivatives::default()
        },
    };

    let underbelly_full =
        ComponentHealth::component_derivative("chassis-underbelly", 1.0, &contribution);
    let underbelly_weak =
        ComponentHealth::component_derivative("chassis-underbelly", 0.4, &contribution);
    let track_full =
        ComponentHealth::component_derivative("chassis-track-wheels", 1.0, &contribution);
    let track_weak =
        ComponentHealth::component_derivative("chassis-track-wheels", 0.4, &contribution);

    assert!(underbelly_weak < underbelly_full);
    approx(track_weak, track_full);
}

#[test]
fn subsystem_degradation_mixes_linear_and_exponential_responses() {
    let contribution = EnvironmentalFactorContribution {
        id: "extreme_heat",
        label: "Extreme heat",
        derivatives: HealthDerivatives {
            engine: -0.2,
            battery: -0.2,
            hydraulics: -0.2,
            ..HealthDerivatives::default()
        },
    };
    let mut state = VehicleState::default();
    let full = state.effective_factor_derivatives(&contribution);

    state.subsystems.engine = 0.4;
    state.subsystems.battery = 0.4;
    state.subsystems.hydraulics = 0.4;
    let weak = state.effective_factor_derivatives(&contribution);

    assert!(weak.engine < full.engine);
    approx(weak.battery, full.battery);
    assert!(weak.hydraulics < full.hydraulics);
}

#[test]
fn chassis_and_sensor_components_degrade_at_distinct_rates() {
    let mut simulation = Simulation::new();
    simulation.set_time_step(1.0);
    simulation.tick(EnvironmentSample {
        temperature_c: 20.0,
        particulate_concentration: 0.01,
        relative_humidity: 0.8,
        salinity_concentration: 0.5,
        irradiance: 0.0,
    });

    let components = simulation.vehicle.state.components;

    assert!(components.chassis_underbelly < components.chassis_frame);
    assert!(components.chassis_frame < components.chassis_suspension);
    assert!(components.sensors_camera < components.sensors_radar);
    assert!(components.sensors_radar < components.sensors_gps);

    approx(
        simulation.vehicle.state.subsystems.chassis,
        components.chassis_health(),
    );
    approx(
        simulation.vehicle.state.subsystems.sensors,
        components.sensors_health(),
    );
}

#[test]
fn material_table_matches_pdf_values() {
    let ah36 = MaterialGrade::AH36.profile();
    approx(ah36.heat_threshold_c, 600.0);
    approx(ah36.cold_threshold_c.unwrap(), 0.0);
    approx(ah36.dust_coeff.unwrap(), 24.0);
    approx(ah36.humidity_coeff.unwrap(), 1.28);
    approx(ah36.salinity_coeff.unwrap(), 0.15);
    assert!(ah36.uv_coeff.is_none());

    let al5083 = MaterialGrade::Al5083.profile();
    approx(al5083.heat_threshold_c, 413.0);
    assert!(al5083.cold_threshold_c.is_none());
    approx(al5083.uv_coeff.unwrap(), 0.01);

    let rubber = MaterialGrade::RubberCompound.profile();
    approx(rubber.heat_threshold_c, 110.0);
    approx(rubber.cold_threshold_c.unwrap(), -45.0);
    approx(rubber.humidity_coeff.unwrap(), 0.03);
    approx(rubber.uv_coeff.unwrap(), 0.28);

    let polyurethane = MaterialGrade::PolyurethaneCoating.profile();
    approx(polyurethane.heat_threshold_c, 120.0);
    approx(polyurethane.cold_threshold_c.unwrap(), -50.0);
    approx(polyurethane.dust_coeff.unwrap(), 0.05);

    let kevlar = MaterialGrade::KevlarComposite.profile();
    approx(kevlar.heat_threshold_c, 177.0);
    approx(kevlar.cold_threshold_c.unwrap(), -196.0);

    let tungsten = MaterialGrade::TungstenCarbide.profile();
    approx(tungsten.heat_threshold_c, 500.0);
    approx(tungsten.dust_coeff.unwrap(), 7.4);
    approx(tungsten.salinity_coeff.unwrap(), 0.01);

    let stainless = MaterialGrade::StainlessSteel316.profile();
    approx(stainless.heat_threshold_c, 870.0);
    approx(stainless.salinity_coeff.unwrap(), 1.98);

    let cast_iron = MaterialGrade::CastIron.profile();
    approx(cast_iron.heat_threshold_c, 600.0);
    approx(cast_iron.dust_coeff.unwrap(), 125.0);

    let nickel = MaterialGrade::NickelAlloy625.profile();
    approx(nickel.heat_threshold_c, 980.0);
    approx(nickel.salinity_coeff.unwrap(), 0.061);

    let sapphire = MaterialGrade::SapphireGlass.profile();
    approx(sapphire.heat_threshold_c, 2040.0);
    approx(sapphire.dust_coeff.unwrap(), 0.00063);

    let phosphate = MaterialGrade::PhosphateEsterFluid.profile();
    approx(phosphate.heat_threshold_c, 120.0);
    approx(phosphate.humidity_coeff.unwrap(), 1.28);
}

#[test]
fn newly_added_frontend_material_keys_resolve() {
    for material in [
        "AH36Steel",
        "AH36 Steel",
        "DH36Steel",
        "DH36 Steel",
        "EH36Steel",
        "EH36 Steel",
        "EH40Steel",
        "EH40 Steel",
        "Aluminum5083",
        "Aluminum5086",
        "GRPFiberglass",
        "CFRPCarbonFiber",
        "TitaniumGrade5",
        "RubberCompound",
        "NitrileRubber",
        "PolyurethaneCoating",
        "Polyimide",
        "Polypropylene",
        "KevlarComposite",
        "CeramicComposite",
        "TungstenCarbide",
        "StainlessSteel",
        "ChromolySteel",
        "CastIron",
        "NickelSuperalloy",
        "Nickel Alloy",
        "Silicon",
        "Germanium",
        "GalliumArsenide",
        "SapphireGlass",
        "BorosilicateGlass",
        "PhosphateEsterFluid",
        "LithiumCompound",
        "PiezoelectricCeramic",
    ] {
        assert!(
            MaterialGrade::from_key(material).is_some(),
            "{material} should resolve"
        );
    }
}

#[test]
fn get_materials_exposes_selector_metadata() {
    let engine = Engine::new();
    let materials: Vec<serde_json::Value> = serde_json::from_str(&engine.get_materials()).unwrap();
    let expected_grades = [
        "MildSteelTemperate",
        "MildSteelColdWeather",
        "AH36",
        "DH36",
        "EH36",
        "EH40",
        "Al5083",
        "Al5086",
        "GRP",
        "CFRP",
        "TiGrade5",
        "KevlarComposite",
        "CeramicComposite",
        "PolyurethaneCoating",
        "TungstenCarbide",
        "RubberCompound",
        "Germanium",
        "SapphireGlass",
        "Polyimide",
        "GalliumArsenide",
        "PiezoelectricCeramic",
        "Silicon",
        "BorosilicateGlass",
        "LithiumCompound",
        "NickelAlloy",
        "Polypropylene",
        "CastIron",
        "NickelSuperalloy",
        "ChromolySteel",
        "NitrileRubber",
        "StainlessSteel",
        "PhosphateEsterFluid",
    ];

    assert_eq!(materials.len(), expected_grades.len());

    let mut engine = Engine::new();
    for (material, expected_grade) in materials.iter().zip(expected_grades) {
        let object = material.as_object().unwrap();
        for field in [
            "grade",
            "label",
            "strength_index",
            "cost",
            "cost_unit",
            "heat_threshold_c",
            "cold_threshold_c",
            "dust_coeff",
            "humidity_coeff",
            "salinity_coeff",
            "uv_coeff",
        ] {
            assert!(
                object.contains_key(field),
                "{expected_grade} missing {field}"
            );
        }

        let grade = object["grade"].as_str().unwrap();
        assert_eq!(grade, expected_grade);
        assert!(!object["label"].as_str().unwrap().is_empty());
        assert!(!object["cost_unit"].as_str().unwrap().is_empty());

        let strength_index = object["strength_index"].as_f64().unwrap();
        let cost = object["cost"].as_f64().unwrap();
        assert!(strength_index.is_finite());
        assert!(cost.is_finite());
        assert!(
            engine.set_material(grade),
            "{grade} should be accepted by set_material"
        );
    }
}

#[test]
fn material_selector_metadata_matches_pdf_cost_and_strength_values() {
    let engine = Engine::new();
    let materials: Vec<serde_json::Value> = serde_json::from_str(&engine.get_materials()).unwrap();

    let find_material = |grade: &str| -> &serde_json::Value {
        materials
            .iter()
            .find(|material| material["grade"] == grade)
            .unwrap_or_else(|| panic!("{grade} not found"))
    };

    let ah36 = find_material("AH36");
    assert_eq!(ah36["label"], "AH36 Steel");
    approx(ah36["strength_index"].as_f64().unwrap(), 0.52);
    approx(ah36["cost"].as_f64().unwrap(), 1.50);
    assert_eq!(ah36["cost_unit"], "USD/kg");

    let tungsten = find_material("TungstenCarbide");
    approx(tungsten["strength_index"].as_f64().unwrap(), 0.88);
    approx(tungsten["cost"].as_f64().unwrap(), 66.50);

    let germanium = find_material("Germanium");
    approx(germanium["strength_index"].as_f64().unwrap(), 0.10);
    approx(germanium["cost"].as_f64().unwrap(), 1340.00);

    let phosphate = find_material("PhosphateEsterFluid");
    approx(phosphate["strength_index"].as_f64().unwrap(), 0.00);
    approx(phosphate["cost"].as_f64().unwrap(), 20.00);
    assert_eq!(phosphate["cost_unit"], "USD/L");
}

#[test]
fn diagnostics_reset_to_all_subsystems_with_no_active_factors() {
    let engine = Engine::new();
    let diagnostics: serde_json::Value = serde_json::from_str(&engine.get_diagnostics()).unwrap();
    let subsystems = diagnostics["subsystems"].as_object().unwrap();
    let components = diagnostics["components"].as_object().unwrap();

    for subsystem in ["chassis", "sensors", "battery", "engine", "hydraulics"] {
        approx(subsystems[subsystem]["dx_dt"].as_f64().unwrap(), 0.0);
        assert_eq!(
            subsystems[subsystem]["factors"].as_array().unwrap().len(),
            0
        );
    }

    for component in [
        "chassis-frame",
        "chassis-plating",
        "chassis-suspension",
        "chassis-underbelly",
        "chassis-track-wheels",
        "chassis-hatches-doors",
        "sensors-thermal",
        "sensors-radar",
        "sensors-acoustic",
        "sensors-gps",
        "sensors-camera",
    ] {
        approx(components[component]["dx_dt"].as_f64().unwrap(), 0.0);
        assert_eq!(
            components[component]["factors"].as_array().unwrap().len(),
            0
        );
    }
}

#[test]
fn diagnostics_report_latest_factor_contributions_sorted_by_impact() {
    let mut engine = Engine::new();
    engine.set_time_step(0.1);
    engine.tick(700.0, 0.1, 0.8, 0.4, 0.0);

    let diagnostics: serde_json::Value = serde_json::from_str(&engine.get_diagnostics()).unwrap();
    let engine_diagnostics = &diagnostics["subsystems"]["engine"];
    let engine_factors = engine_diagnostics["factors"].as_array().unwrap();

    assert_eq!(engine_factors[0]["id"], "dust_ingestion");
    assert_eq!(engine_factors[0]["label"], "Dust ingestion");
    assert_eq!(engine_factors[1]["id"], "extreme_heat");
    approx(
        engine_diagnostics["dx_dt"].as_f64().unwrap(),
        engine_factors
            .iter()
            .map(|factor| factor["dx_dt"].as_f64().unwrap())
            .sum(),
    );

    let battery_diagnostics = &diagnostics["subsystems"]["battery"];
    assert_eq!(battery_diagnostics["factors"][0]["id"], "extreme_heat");
    approx(
        battery_diagnostics["dx_dt"].as_f64().unwrap(),
        battery_diagnostics["factors"][0]["dx_dt"].as_f64().unwrap(),
    );
}

#[test]
fn component_diagnostics_use_component_specific_rates() {
    let mut engine = Engine::new();
    engine.set_time_step(0.1);
    engine.tick(20.0, 0.01, 0.8, 0.5, 0.0);

    let diagnostics: serde_json::Value = serde_json::from_str(&engine.get_diagnostics()).unwrap();
    let snapshot: serde_json::Value = serde_json::from_str(&engine.get_vehicle()).unwrap();
    let components = diagnostics["components"].as_object().unwrap();

    assert!(
        snapshot["components"]["chassis-underbelly"]
            .as_f64()
            .unwrap()
            < snapshot["components"]["chassis-suspension"]
                .as_f64()
                .unwrap()
    );
    assert!(
        snapshot["components"]["sensors-camera"].as_f64().unwrap()
            < snapshot["components"]["sensors-gps"].as_f64().unwrap()
    );

    assert!(
        components["chassis-underbelly"]["dx_dt"].as_f64().unwrap()
            < components["chassis-suspension"]["dx_dt"].as_f64().unwrap()
    );
    assert!(
        components["sensors-camera"]["dx_dt"].as_f64().unwrap()
            < components["sensors-gps"]["dx_dt"].as_f64().unwrap()
    );
    assert_eq!(
        components["sensors-camera"]["factors"][0]["id"],
        "dust_ingestion"
    );
}

#[test]
fn diagnostics_clear_after_reset() {
    let mut engine = Engine::new();
    engine.tick(700.0, 0.1, 0.8, 0.4, 0.0);
    engine.reset();

    let diagnostics: serde_json::Value = serde_json::from_str(&engine.get_diagnostics()).unwrap();
    for subsystem in ["chassis", "sensors", "battery", "engine", "hydraulics"] {
        approx(
            diagnostics["subsystems"][subsystem]["dx_dt"]
                .as_f64()
                .unwrap(),
            0.0,
        );
        assert_eq!(
            diagnostics["subsystems"][subsystem]["factors"]
                .as_array()
                .unwrap()
                .len(),
            0,
        );
    }

    for component in [
        "chassis-frame",
        "chassis-plating",
        "chassis-suspension",
        "chassis-underbelly",
        "chassis-track-wheels",
        "chassis-hatches-doors",
        "sensors-thermal",
        "sensors-radar",
        "sensors-acoustic",
        "sensors-gps",
        "sensors-camera",
    ] {
        approx(
            diagnostics["components"][component]["dx_dt"]
                .as_f64()
                .unwrap(),
            0.0,
        );
        assert_eq!(
            diagnostics["components"][component]["factors"]
                .as_array()
                .unwrap()
                .len(),
            0,
        );
    }
}
