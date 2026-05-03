pub mod modules;
pub use modules::*;

pub mod simulation;
pub use simulation::*;

pub mod vehicle;
pub use vehicle::*;

use serde::Serialize;
use wasm_bindgen::prelude::*;

#[derive(Debug, Serialize)]
struct EngineSnapshot {
    frame: u64,
    elapsed_s: f64,
    material: String,
    environment: EnvironmentSample,
    derivatives: HealthDerivatives,
    subsystems: SubsystemHealth,
    vehicle_health: f64,
    thresholds: EnvironmentalThresholds,
    coefficients: CoefficientMatrix,
}

#[wasm_bindgen]
pub struct Engine {
    simulation: Simulation,
}

#[wasm_bindgen]
impl Engine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Engine {
        Engine {
            simulation: Simulation::new(),
        }
    }

    pub fn tick(
        &mut self,
        temperature_c: f64,
        particulate_concentration: f64,
        relative_humidity: f64,
        salinity_concentration: f64,
        irradiance: f64,
    ) -> String {
        let sample = EnvironmentSample {
            temperature_c,
            particulate_concentration,
            relative_humidity,
            salinity_concentration,
            irradiance,
        };
        self.simulation.tick(sample);
        self.get_vehicle()
    }

    pub fn reset(&mut self) {
        self.simulation.reset();
    }

    pub fn set_material(&mut self, material: &str) -> bool {
        self.simulation.set_material(material)
    }

    pub fn set_time_step(&mut self, dt_s: f64) {
        self.simulation.set_time_step(dt_s);
    }

    pub fn get_vehicle(&self) -> String {
        serde_json::to_string(&self.snapshot()).unwrap()
    }

    pub fn get_materials(&self) -> String {
        let materials: Vec<MaterialProfile> = MaterialGrade::all()
            .iter()
            .map(|grade| grade.profile())
            .collect();
        serde_json::to_string(&materials).unwrap()
    }
}

impl Engine {
    fn snapshot(&self) -> EngineSnapshot {
        let vehicle = &self.simulation.vehicle;
        EngineSnapshot {
            frame: vehicle.state.frame,
            elapsed_s: vehicle.state.elapsed_s,
            material: vehicle.properties.material_grade.key().to_string(),
            environment: self.simulation.last_environment,
            derivatives: self.simulation.last_derivatives,
            subsystems: vehicle.state.subsystems,
            vehicle_health: vehicle.state.vehicle_health,
            thresholds: vehicle.properties.thresholds,
            coefficients: vehicle.properties.coefficients,
        }
    }
}
