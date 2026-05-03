use crate::{EnvironmentalFactorContribution, HealthDerivatives};
use serde::{Deserialize, Serialize};

pub const CHASSIS_COMPONENT_IDS: [&str; 6] = [
    "chassis-frame",
    "chassis-plating",
    "chassis-suspension",
    "chassis-underbelly",
    "chassis-track-wheels",
    "chassis-hatches-doors",
];

pub const SENSOR_COMPONENT_IDS: [&str; 5] = [
    "sensors-thermal",
    "sensors-radar",
    "sensors-acoustic",
    "sensors-gps",
    "sensors-camera",
];

#[derive(Debug, Clone, Copy)]
enum DegradationCurve {
    Linear,
    Accelerating { acceleration: f64 },
}

#[derive(Debug, Clone, Copy)]
struct DegradationResponse {
    rate: f64,
    curve: DegradationCurve,
}

impl DegradationResponse {
    const fn linear(rate: f64) -> Self {
        Self {
            rate,
            curve: DegradationCurve::Linear,
        }
    }

    const fn accelerating(rate: f64, acceleration: f64) -> Self {
        Self {
            rate,
            curve: DegradationCurve::Accelerating { acceleration },
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct SubsystemHealth {
    pub engine: f64,
    pub battery: f64,
    pub hydraulics: f64,
    pub sensors: f64,
    pub chassis: f64,
}

impl Default for SubsystemHealth {
    fn default() -> Self {
        Self {
            engine: 1.0,
            battery: 1.0,
            hydraulics: 1.0,
            sensors: 1.0,
            chassis: 1.0,
        }
    }
}

impl SubsystemHealth {
    pub fn vehicle_health(&self) -> f64 {
        (4.0 / 13.0) * self.engine
            + (3.0 / 13.0) * self.battery
            + (3.0 / 13.0) * self.hydraulics
            + (1.0 / 13.0) * self.sensors
            + (2.0 / 13.0) * self.chassis
    }

    pub fn apply_derivatives(&mut self, derivatives: HealthDerivatives, dt_s: f64) {
        let dt_s = dt_s.max(0.0);
        self.engine = clamp_health(self.engine + derivatives.engine * dt_s);
        self.battery = clamp_health(self.battery + derivatives.battery * dt_s);
        self.hydraulics = clamp_health(self.hydraulics + derivatives.hydraulics * dt_s);
        self.sensors = clamp_health(self.sensors + derivatives.sensors * dt_s);
        self.chassis = clamp_health(self.chassis + derivatives.chassis * dt_s);
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct ComponentHealth {
    #[serde(rename = "chassis-frame")]
    pub chassis_frame: f64,
    #[serde(rename = "chassis-plating")]
    pub chassis_plating: f64,
    #[serde(rename = "chassis-suspension")]
    pub chassis_suspension: f64,
    #[serde(rename = "chassis-underbelly")]
    pub chassis_underbelly: f64,
    #[serde(rename = "chassis-track-wheels")]
    pub chassis_track_wheels: f64,
    #[serde(rename = "chassis-hatches-doors")]
    pub chassis_hatches_doors: f64,
    #[serde(rename = "sensors-thermal")]
    pub sensors_thermal: f64,
    #[serde(rename = "sensors-radar")]
    pub sensors_radar: f64,
    #[serde(rename = "sensors-acoustic")]
    pub sensors_acoustic: f64,
    #[serde(rename = "sensors-gps")]
    pub sensors_gps: f64,
    #[serde(rename = "sensors-camera")]
    pub sensors_camera: f64,
}

impl Default for ComponentHealth {
    fn default() -> Self {
        Self {
            chassis_frame: 1.0,
            chassis_plating: 1.0,
            chassis_suspension: 1.0,
            chassis_underbelly: 1.0,
            chassis_track_wheels: 1.0,
            chassis_hatches_doors: 1.0,
            sensors_thermal: 1.0,
            sensors_radar: 1.0,
            sensors_acoustic: 1.0,
            sensors_gps: 1.0,
            sensors_camera: 1.0,
        }
    }
}

impl ComponentHealth {
    pub fn apply_factor_contributions(
        &mut self,
        contributions: &[EnvironmentalFactorContribution],
        dt_s: f64,
    ) {
        let dt_s = dt_s.max(0.0);
        for contribution in contributions {
            self.chassis_frame =
                apply_component_delta(self.chassis_frame, "chassis-frame", contribution, dt_s);
            self.chassis_plating =
                apply_component_delta(self.chassis_plating, "chassis-plating", contribution, dt_s);
            self.chassis_suspension = apply_component_delta(
                self.chassis_suspension,
                "chassis-suspension",
                contribution,
                dt_s,
            );
            self.chassis_underbelly = apply_component_delta(
                self.chassis_underbelly,
                "chassis-underbelly",
                contribution,
                dt_s,
            );
            self.chassis_track_wheels = apply_component_delta(
                self.chassis_track_wheels,
                "chassis-track-wheels",
                contribution,
                dt_s,
            );
            self.chassis_hatches_doors = apply_component_delta(
                self.chassis_hatches_doors,
                "chassis-hatches-doors",
                contribution,
                dt_s,
            );
            self.sensors_thermal =
                apply_component_delta(self.sensors_thermal, "sensors-thermal", contribution, dt_s);
            self.sensors_radar =
                apply_component_delta(self.sensors_radar, "sensors-radar", contribution, dt_s);
            self.sensors_acoustic = apply_component_delta(
                self.sensors_acoustic,
                "sensors-acoustic",
                contribution,
                dt_s,
            );
            self.sensors_gps =
                apply_component_delta(self.sensors_gps, "sensors-gps", contribution, dt_s);
            self.sensors_camera =
                apply_component_delta(self.sensors_camera, "sensors-camera", contribution, dt_s);
        }
    }

    pub fn chassis_health(&self) -> f64 {
        mean(&[
            self.chassis_frame,
            self.chassis_plating,
            self.chassis_suspension,
            self.chassis_underbelly,
            self.chassis_track_wheels,
            self.chassis_hatches_doors,
        ])
    }

    pub fn sensors_health(&self) -> f64 {
        mean(&[
            self.sensors_thermal,
            self.sensors_radar,
            self.sensors_acoustic,
            self.sensors_gps,
            self.sensors_camera,
        ])
    }

    pub fn component_derivative(
        component_id: &str,
        component_health: f64,
        contribution: &EnvironmentalFactorContribution,
    ) -> f64 {
        let base_derivative = if is_chassis_component(component_id) {
            contribution.derivatives.chassis
        } else if is_sensor_component(component_id) {
            contribution.derivatives.sensors
        } else {
            return 0.0;
        };

        if base_derivative == 0.0 {
            return 0.0;
        }

        let factor_multiplier = if is_chassis_component(component_id) {
            chassis_component_factor_multiplier(component_id, contribution.id)
        } else {
            sensor_component_factor_multiplier(component_id, contribution.id)
        };
        let response = component_degradation_response(component_id);
        effective_degradation_derivative(
            component_health,
            base_derivative * factor_multiplier,
            response,
        )
    }

    pub fn current_health_for(&self, component_id: &str) -> f64 {
        match component_id {
            "chassis-frame" => self.chassis_frame,
            "chassis-plating" => self.chassis_plating,
            "chassis-suspension" => self.chassis_suspension,
            "chassis-underbelly" => self.chassis_underbelly,
            "chassis-track-wheels" => self.chassis_track_wheels,
            "chassis-hatches-doors" => self.chassis_hatches_doors,
            "sensors-thermal" => self.sensors_thermal,
            "sensors-radar" => self.sensors_radar,
            "sensors-acoustic" => self.sensors_acoustic,
            "sensors-gps" => self.sensors_gps,
            "sensors-camera" => self.sensors_camera,
            _ => 0.0,
        }
    }

    pub fn effective_component_derivative(
        &self,
        component_id: &str,
        contribution: &EnvironmentalFactorContribution,
    ) -> f64 {
        Self::component_derivative(
            component_id,
            self.current_health_for(component_id),
            contribution,
        )
    }

    pub fn effective_chassis_derivative(
        &self,
        contribution: &EnvironmentalFactorContribution,
    ) -> f64 {
        mean(&[
            self.effective_component_derivative("chassis-frame", contribution),
            self.effective_component_derivative("chassis-plating", contribution),
            self.effective_component_derivative("chassis-suspension", contribution),
            self.effective_component_derivative("chassis-underbelly", contribution),
            self.effective_component_derivative("chassis-track-wheels", contribution),
            self.effective_component_derivative("chassis-hatches-doors", contribution),
        ])
    }

    pub fn effective_sensors_derivative(
        &self,
        contribution: &EnvironmentalFactorContribution,
    ) -> f64 {
        mean(&[
            self.effective_component_derivative("sensors-thermal", contribution),
            self.effective_component_derivative("sensors-radar", contribution),
            self.effective_component_derivative("sensors-acoustic", contribution),
            self.effective_component_derivative("sensors-gps", contribution),
            self.effective_component_derivative("sensors-camera", contribution),
        ])
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VehicleState {
    pub frame: u64,
    pub elapsed_s: f64,
    pub subsystems: SubsystemHealth,
    pub components: ComponentHealth,
    pub vehicle_health: f64,
}

impl Default for VehicleState {
    fn default() -> Self {
        let subsystems = SubsystemHealth::default();
        Self {
            frame: 0,
            elapsed_s: 0.0,
            vehicle_health: subsystems.vehicle_health(),
            subsystems,
            components: ComponentHealth::default(),
        }
    }
}

impl VehicleState {
    pub fn update_component_aggregates(&mut self) {
        self.subsystems.chassis = self.components.chassis_health();
        self.subsystems.sensors = self.components.sensors_health();
    }

    pub fn update_vehicle_health(&mut self) {
        self.vehicle_health = self.subsystems.vehicle_health();
    }

    pub fn effective_factor_derivatives(
        &self,
        contribution: &EnvironmentalFactorContribution,
    ) -> HealthDerivatives {
        HealthDerivatives {
            engine: effective_subsystem_derivative(
                "engine",
                self.subsystems.engine,
                contribution.derivatives.engine,
            ),
            battery: effective_subsystem_derivative(
                "battery",
                self.subsystems.battery,
                contribution.derivatives.battery,
            ),
            hydraulics: effective_subsystem_derivative(
                "hydraulics",
                self.subsystems.hydraulics,
                contribution.derivatives.hydraulics,
            ),
            sensors: self.components.effective_sensors_derivative(contribution),
            chassis: self.components.effective_chassis_derivative(contribution),
        }
    }
}

fn clamp_health(value: f64) -> f64 {
    if value.is_finite() {
        value.clamp(0.0, 1.0)
    } else {
        0.0
    }
}

fn apply_component_delta(
    value: f64,
    component_id: &str,
    contribution: &EnvironmentalFactorContribution,
    dt_s: f64,
) -> f64 {
    let dx_dt = ComponentHealth::component_derivative(component_id, value, contribution);
    clamp_health(value + dx_dt * dt_s)
}

fn mean(values: &[f64]) -> f64 {
    values.iter().sum::<f64>() / values.len().max(1) as f64
}

fn is_chassis_component(component_id: &str) -> bool {
    CHASSIS_COMPONENT_IDS.contains(&component_id)
}

fn is_sensor_component(component_id: &str) -> bool {
    SENSOR_COMPONENT_IDS.contains(&component_id)
}

fn effective_subsystem_derivative(subsystem_id: &str, health: f64, derivative: f64) -> f64 {
    if derivative == 0.0 {
        return 0.0;
    }

    effective_degradation_derivative(
        health,
        derivative,
        subsystem_degradation_response(subsystem_id),
    )
}

fn effective_degradation_derivative(
    health: f64,
    derivative: f64,
    response: DegradationResponse,
) -> f64 {
    let scaled = derivative * response.rate.max(0.0);
    if scaled >= 0.0 {
        return scaled;
    }

    match response.curve {
        DegradationCurve::Linear => scaled,
        DegradationCurve::Accelerating { acceleration } => {
            let damage_fraction = 1.0 - clamp_health(health);
            scaled * (acceleration.max(0.0) * damage_fraction).exp()
        }
    }
}

fn subsystem_degradation_response(subsystem_id: &str) -> DegradationResponse {
    match subsystem_id {
        "engine" => DegradationResponse::accelerating(1.05, 1.10),
        "battery" => DegradationResponse::linear(0.85),
        "hydraulics" => DegradationResponse::accelerating(1.15, 1.30),
        _ => DegradationResponse::linear(0.0),
    }
}

fn component_degradation_response(component_id: &str) -> DegradationResponse {
    match component_id {
        "chassis-frame" => DegradationResponse::linear(0.95),
        "chassis-plating" => DegradationResponse::accelerating(1.10, 0.75),
        "chassis-suspension" => DegradationResponse::accelerating(0.85, 1.20),
        "chassis-underbelly" => DegradationResponse::accelerating(1.25, 1.10),
        "chassis-track-wheels" => DegradationResponse::linear(1.05),
        "chassis-hatches-doors" => DegradationResponse::accelerating(0.90, 1.60),
        "sensors-thermal" => DegradationResponse::accelerating(1.05, 0.95),
        "sensors-radar" => DegradationResponse::linear(1.00),
        "sensors-acoustic" => DegradationResponse::accelerating(0.85, 1.35),
        "sensors-gps" => DegradationResponse::linear(0.70),
        "sensors-camera" => DegradationResponse::accelerating(1.20, 1.50),
        _ => DegradationResponse::linear(0.0),
    }
}

pub fn chassis_component_factor_multiplier(component_id: &str, factor_id: &str) -> f64 {
    match factor_id {
        "humidity" => match component_id {
            "chassis-frame" => 1.10,
            "chassis-plating" => 0.85,
            "chassis-suspension" => 0.75,
            "chassis-underbelly" => 1.05,
            "chassis-track-wheels" => 0.80,
            "chassis-hatches-doors" => 1.45,
            _ => 0.0,
        },
        "salinity" => match component_id {
            "chassis-frame" => 0.95,
            "chassis-plating" => 1.20,
            "chassis-suspension" => 0.65,
            "chassis-underbelly" => 1.55,
            "chassis-track-wheels" => 1.25,
            "chassis-hatches-doors" => 0.40,
            _ => 0.0,
        },
        _ => match component_id {
            "chassis-frame"
            | "chassis-plating"
            | "chassis-suspension"
            | "chassis-underbelly"
            | "chassis-track-wheels"
            | "chassis-hatches-doors" => 1.0,
            _ => 0.0,
        },
    }
}

pub fn sensor_component_factor_multiplier(component_id: &str, factor_id: &str) -> f64 {
    match factor_id {
        "dust_ingestion" => match component_id {
            "sensors-thermal" => 0.85,
            "sensors-radar" => 1.20,
            "sensors-acoustic" => 0.55,
            "sensors-gps" => 0.35,
            "sensors-camera" => 2.05,
            _ => 0.0,
        },
        "humidity" => match component_id {
            "sensors-thermal" => 1.15,
            "sensors-radar" => 0.95,
            "sensors-acoustic" => 1.30,
            "sensors-gps" => 0.75,
            "sensors-camera" => 0.85,
            _ => 0.0,
        },
        "uv_solar_radiation" => match component_id {
            "sensors-thermal" => 1.25,
            "sensors-radar" => 0.75,
            "sensors-acoustic" => 0.40,
            "sensors-gps" => 0.65,
            "sensors-camera" => 1.95,
            _ => 0.0,
        },
        _ => match component_id {
            "sensors-thermal" | "sensors-radar" | "sensors-acoustic" | "sensors-gps"
            | "sensors-camera" => 1.0,
            _ => 0.0,
        },
    }
}
