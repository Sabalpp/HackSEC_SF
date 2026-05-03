use crate::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct EnvironmentSample {
    pub temperature_c: f64,
    pub particulate_concentration: f64,
    pub relative_humidity: f64,
    pub salinity_concentration: f64,
    pub irradiance: f64,
}

impl Default for EnvironmentSample {
    fn default() -> Self {
        Self {
            temperature_c: 20.0,
            particulate_concentration: 0.0,
            relative_humidity: 0.0,
            salinity_concentration: 0.0,
            irradiance: 0.0,
        }
    }
}

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize)]
pub struct HealthDerivatives {
    pub engine: f64,
    pub battery: f64,
    pub hydraulics: f64,
    pub sensors: f64,
    pub chassis: f64,
}

impl HealthDerivatives {
    fn add(&mut self, other: HealthDerivatives) {
        self.engine += other.engine;
        self.battery += other.battery;
        self.hydraulics += other.hydraulics;
        self.sensors += other.sensors;
        self.chassis += other.chassis;
    }
}

pub fn compute_derivatives(
    properties: &VehicleProperties,
    sample: EnvironmentSample,
) -> HealthDerivatives {
    let mut derivatives = HealthDerivatives::default();
    derivatives.add(extreme_heat(properties, sample.temperature_c));
    derivatives.add(extreme_cold(properties, sample.temperature_c));
    derivatives.add(dust_ingestion(properties, sample.particulate_concentration));
    derivatives.add(humidity(properties, sample.relative_humidity));
    derivatives.add(salinity(properties, sample.salinity_concentration));
    derivatives.add(uv_solar_radiation(properties, sample.irradiance));
    derivatives
}

pub fn apply_environmental_modules(
    vehicle: &mut Vehicle,
    sample: EnvironmentSample,
    dt_s: f64,
) -> HealthDerivatives {
    let derivatives = compute_derivatives(&vehicle.properties, sample);
    vehicle
        .state
        .subsystems
        .apply_derivatives(derivatives, dt_s);
    vehicle.state.elapsed_s += dt_s.max(0.0);
    vehicle.state.frame += 1;
    vehicle.state.update_vehicle_health();
    derivatives
}

pub fn extreme_heat(properties: &VehicleProperties, temperature_c: f64) -> HealthDerivatives {
    let c = properties.coefficients;
    let t = properties.thresholds;

    HealthDerivatives {
        engine: -c.engine_heat * (temperature_c - t.engine_heat_c).max(0.0),
        battery: -c.battery_heat * (temperature_c - t.battery_heat_c).max(0.0),
        hydraulics: -c.hydraulics_heat * (temperature_c - t.hydraulics_heat_c).max(0.0),
        sensors: 0.0,
        chassis: 0.0,
    }
}

pub fn extreme_cold(properties: &VehicleProperties, temperature_c: f64) -> HealthDerivatives {
    let c = properties.coefficients;
    let t = properties.thresholds;

    HealthDerivatives {
        engine: -c.engine_cold
            * t.engine_cold_c
                .map(|threshold| (threshold - temperature_c).max(0.0))
                .unwrap_or(0.0),
        battery: -c.battery_cold
            * t.battery_cold_c
                .map(|threshold| (threshold - temperature_c).max(0.0))
                .unwrap_or(0.0),
        hydraulics: -c.hydraulics_cold
            * t.hydraulics_cold_c
                .map(|threshold| (threshold - temperature_c).max(0.0))
                .unwrap_or(0.0),
        sensors: 0.0,
        chassis: 0.0,
    }
}

pub fn dust_ingestion(
    properties: &VehicleProperties,
    particulate_concentration: f64,
) -> HealthDerivatives {
    let c = properties.coefficients;
    let d = particulate_concentration.max(0.0);

    HealthDerivatives {
        engine: -c.engine_dust * d,
        battery: 0.0,
        hydraulics: 0.0,
        sensors: -c.sensors_dust * d,
        chassis: 0.0,
    }
}

pub fn humidity(properties: &VehicleProperties, relative_humidity: f64) -> HealthDerivatives {
    let c = properties.coefficients;
    let t = properties.thresholds;
    let y = relative_humidity.max(0.0);

    HealthDerivatives {
        engine: 0.0,
        battery: 0.0,
        hydraulics: 0.0,
        sensors: -c.sensors_humidity * (y - t.sensors_humidity).max(0.0),
        chassis: -c.chassis_humidity * (y - t.chassis_humidity).max(0.0),
    }
}

pub fn salinity(properties: &VehicleProperties, salinity_concentration: f64) -> HealthDerivatives {
    let c = properties.coefficients;
    let sigma = salinity_concentration.max(0.0);

    HealthDerivatives {
        engine: 0.0,
        battery: 0.0,
        hydraulics: 0.0,
        sensors: 0.0,
        chassis: -c.chassis_salinity * sigma.powi(2),
    }
}

pub fn uv_solar_radiation(properties: &VehicleProperties, irradiance: f64) -> HealthDerivatives {
    let c = properties.coefficients;
    let u = irradiance.max(0.0);

    HealthDerivatives {
        engine: 0.0,
        battery: -c.battery_uv * u.powi(2),
        hydraulics: -c.hydraulics_uv * u,
        sensors: -c.sensors_uv * u,
        chassis: 0.0,
    }
}
