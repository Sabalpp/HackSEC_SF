use crate::*;
use serde::{Deserialize, Serialize};

const ACTIVE_FACTOR_EPSILON: f64 = 1e-12;

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

#[derive(Debug, Clone, Copy)]
pub struct EnvironmentalFactorContribution {
    pub id: &'static str,
    pub label: &'static str,
    pub derivatives: HealthDerivatives,
}

#[derive(Debug, Clone, Serialize)]
pub struct FactorDiagnostic {
    pub id: &'static str,
    pub label: &'static str,
    pub dx_dt: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct SubsystemDiagnostic {
    pub dx_dt: f64,
    pub factors: Vec<FactorDiagnostic>,
}

#[derive(Debug, Clone, Serialize)]
pub struct DiagnosticsSubsystems {
    pub chassis: SubsystemDiagnostic,
    pub sensors: SubsystemDiagnostic,
    pub battery: SubsystemDiagnostic,
    pub engine: SubsystemDiagnostic,
    pub hydraulics: SubsystemDiagnostic,
}

#[derive(Debug, Clone, Serialize)]
pub struct DiagnosticsSnapshot {
    pub subsystems: DiagnosticsSubsystems,
}

impl Default for DiagnosticsSnapshot {
    fn default() -> Self {
        Self::from_factor_contributions(&[])
    }
}

impl DiagnosticsSnapshot {
    pub fn from_factor_contributions(contributions: &[EnvironmentalFactorContribution]) -> Self {
        Self {
            subsystems: DiagnosticsSubsystems {
                chassis: diagnostic_for_subsystem(SubsystemKind::Chassis, contributions),
                sensors: diagnostic_for_subsystem(SubsystemKind::Sensors, contributions),
                battery: diagnostic_for_subsystem(SubsystemKind::Battery, contributions),
                engine: diagnostic_for_subsystem(SubsystemKind::Engine, contributions),
                hydraulics: diagnostic_for_subsystem(SubsystemKind::Hydraulics, contributions),
            },
        }
    }
}

#[derive(Debug, Clone, Copy)]
enum SubsystemKind {
    Engine,
    Battery,
    Hydraulics,
    Sensors,
    Chassis,
}

pub fn compute_derivatives(
    properties: &VehicleProperties,
    sample: EnvironmentSample,
) -> HealthDerivatives {
    let mut derivatives = HealthDerivatives::default();
    for contribution in compute_factor_contributions(properties, sample) {
        derivatives.add(contribution.derivatives);
    }
    derivatives
}

pub fn compute_factor_contributions(
    properties: &VehicleProperties,
    sample: EnvironmentSample,
) -> Vec<EnvironmentalFactorContribution> {
    vec![
        EnvironmentalFactorContribution {
            id: "extreme_heat",
            label: "Extreme heat",
            derivatives: extreme_heat(properties, sample.temperature_c),
        },
        EnvironmentalFactorContribution {
            id: "extreme_cold",
            label: "Extreme cold",
            derivatives: extreme_cold(properties, sample.temperature_c),
        },
        EnvironmentalFactorContribution {
            id: "dust_ingestion",
            label: "Dust ingestion",
            derivatives: dust_ingestion(properties, sample.particulate_concentration),
        },
        EnvironmentalFactorContribution {
            id: "humidity",
            label: "Humidity",
            derivatives: humidity(properties, sample.relative_humidity),
        },
        EnvironmentalFactorContribution {
            id: "salinity",
            label: "Salinity",
            derivatives: salinity(properties, sample.salinity_concentration),
        },
        EnvironmentalFactorContribution {
            id: "uv_solar_radiation",
            label: "UV / solar radiation",
            derivatives: uv_solar_radiation(properties, sample.irradiance),
        },
    ]
}

pub fn compute_diagnostics(
    properties: &VehicleProperties,
    sample: EnvironmentSample,
) -> DiagnosticsSnapshot {
    let contributions = compute_factor_contributions(properties, sample);
    DiagnosticsSnapshot::from_factor_contributions(&contributions)
}

pub fn evaluate_environmental_modules(
    vehicle: &mut Vehicle,
    sample: EnvironmentSample,
    dt_s: f64,
) -> (HealthDerivatives, DiagnosticsSnapshot) {
    let contributions = compute_factor_contributions(&vehicle.properties, sample);
    let mut derivatives = HealthDerivatives::default();
    for contribution in &contributions {
        derivatives.add(contribution.derivatives);
    }
    let diagnostics = DiagnosticsSnapshot::from_factor_contributions(&contributions);

    vehicle
        .state
        .subsystems
        .apply_derivatives(derivatives, dt_s);
    vehicle.state.elapsed_s += dt_s.max(0.0);
    vehicle.state.frame += 1;
    vehicle.state.update_vehicle_health();

    (derivatives, diagnostics)
}

pub fn apply_environmental_modules(
    vehicle: &mut Vehicle,
    sample: EnvironmentSample,
    dt_s: f64,
) -> HealthDerivatives {
    let (derivatives, _) = evaluate_environmental_modules(vehicle, sample, dt_s);
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

fn diagnostic_for_subsystem(
    subsystem: SubsystemKind,
    contributions: &[EnvironmentalFactorContribution],
) -> SubsystemDiagnostic {
    let mut factors: Vec<FactorDiagnostic> = contributions
        .iter()
        .filter_map(|contribution| {
            let dx_dt = contribution.derivatives.for_subsystem(subsystem);
            (dx_dt.abs() > ACTIVE_FACTOR_EPSILON).then_some(FactorDiagnostic {
                id: contribution.id,
                label: contribution.label,
                dx_dt,
            })
        })
        .collect();

    factors.sort_by(|left, right| {
        right
            .dx_dt
            .abs()
            .total_cmp(&left.dx_dt.abs())
            .then_with(|| left.id.cmp(right.id))
    });

    let dx_dt = factors.iter().map(|factor| factor.dx_dt).sum::<f64>();

    SubsystemDiagnostic {
        dx_dt: clean_zero(dx_dt),
        factors,
    }
}

impl HealthDerivatives {
    fn for_subsystem(&self, subsystem: SubsystemKind) -> f64 {
        match subsystem {
            SubsystemKind::Engine => self.engine,
            SubsystemKind::Battery => self.battery,
            SubsystemKind::Hydraulics => self.hydraulics,
            SubsystemKind::Sensors => self.sensors,
            SubsystemKind::Chassis => self.chassis,
        }
    }
}

fn clean_zero(value: f64) -> f64 {
    if value.abs() <= ACTIVE_FACTOR_EPSILON {
        0.0
    } else {
        value
    }
}
