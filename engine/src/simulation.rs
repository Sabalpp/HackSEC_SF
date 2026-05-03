use crate::*;

#[derive(Debug, Clone)]
pub struct Simulation {
    pub vehicle: Vehicle,
    pub dt_s: f64,
    pub last_environment: EnvironmentSample,
    pub last_derivatives: HealthDerivatives,
    pub last_diagnostics: DiagnosticsSnapshot,
}

impl Default for Simulation {
    fn default() -> Self {
        Self::new()
    }
}

impl Simulation {
    pub fn new() -> Self {
        Self {
            vehicle: Vehicle::configured(MaterialGrade::MildSteelTemperate),
            dt_s: 1.0,
            last_environment: EnvironmentSample::default(),
            last_derivatives: HealthDerivatives::default(),
            last_diagnostics: DiagnosticsSnapshot::default(),
        }
    }

    pub fn with_material(material_grade: MaterialGrade) -> Self {
        Self {
            vehicle: Vehicle::configured(material_grade),
            ..Self::new()
        }
    }

    pub fn tick(&mut self, sample: EnvironmentSample) -> &VehicleState {
        self.last_environment = sample;
        let (derivatives, diagnostics) =
            evaluate_environmental_modules(&mut self.vehicle, sample, self.dt_s);
        self.last_derivatives = derivatives;
        self.last_diagnostics = diagnostics;
        &self.vehicle.state
    }

    pub fn reset(&mut self) {
        let material_grade = self.vehicle.properties.material_grade;
        self.vehicle = Vehicle::configured(material_grade);
        self.last_environment = EnvironmentSample::default();
        self.last_derivatives = HealthDerivatives::default();
        self.last_diagnostics = DiagnosticsSnapshot::default();
    }

    pub fn set_material(&mut self, material: &str) -> bool {
        if let Some(material_grade) = MaterialGrade::from_key(material) {
            self.vehicle = Vehicle::configured(material_grade);
            self.last_derivatives = HealthDerivatives::default();
            self.last_diagnostics = DiagnosticsSnapshot::default();
            true
        } else {
            false
        }
    }

    pub fn set_time_step(&mut self, dt_s: f64) {
        if dt_s.is_finite() {
            self.dt_s = dt_s.clamp(0.0, 3600.0);
        }
    }
}
