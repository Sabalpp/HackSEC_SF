use crate::HealthDerivatives;
use serde::{Deserialize, Serialize};

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VehicleState {
    pub frame: u64,
    pub elapsed_s: f64,
    pub subsystems: SubsystemHealth,
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
        }
    }
}

impl VehicleState {
    pub fn update_vehicle_health(&mut self) {
        self.vehicle_health = self.subsystems.vehicle_health();
    }
}

fn clamp_health(value: f64) -> f64 {
    if value.is_finite() {
        value.clamp(0.0, 1.0)
    } else {
        0.0
    }
}
