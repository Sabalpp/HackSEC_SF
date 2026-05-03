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
}

#[test]
fn diagnostics_reset_to_all_subsystems_with_no_active_factors() {
    let engine = Engine::new();
    let diagnostics: serde_json::Value = serde_json::from_str(&engine.get_diagnostics()).unwrap();
    let subsystems = diagnostics["subsystems"].as_object().unwrap();

    for subsystem in ["chassis", "sensors", "battery", "engine", "hydraulics"] {
        approx(subsystems[subsystem]["dx_dt"].as_f64().unwrap(), 0.0);
        assert_eq!(
            subsystems[subsystem]["factors"].as_array().unwrap().len(),
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
}
