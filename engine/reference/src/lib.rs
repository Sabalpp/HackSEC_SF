pub mod ship;
pub use ship::*;
pub mod modules;
pub use modules::*;
pub mod simulation;
pub use simulation::*;

use serde::Serialize;
use wasm_bindgen::prelude::*;

#[derive(Serialize)]
pub struct PlateInfo {
    pub zone: String,
    pub fatigue_life: f64,
    pub thickness_m: f64,
}

#[wasm_bindgen]
pub struct Engine {
    ship: Ship,
    wave: Wave,
    motion: Motion,
    material_grade: MaterialGrade,
    environment_config: EnvironmentConfig,
    frame: u64,
    simulation_time_s: f64,
}

fn parse_material_grade(material: &str) -> Option<MaterialGrade> {
    Some(match material {
        "mild_steel_temperate" => MaterialGrade::MildSteelTemperate,
        "mild_steel_cold" => MaterialGrade::MildSteelColdWeather,
        "ah36" => MaterialGrade::HighStrengthAH36,
        "dh36" => MaterialGrade::HighStrengthDH36,
        "eh36" => MaterialGrade::HighStrengthEH36,
        "eh40" => MaterialGrade::UltraHighStrengthEH40,
        "aluminum_5083" => MaterialGrade::Aluminum5083,
        "aluminum_5086" => MaterialGrade::Aluminum5086,
        "grp" => MaterialGrade::GRPFiberglass,
        "cfrp" => MaterialGrade::CFRPCarbonFiber,
        "titanium" => MaterialGrade::TitaniumGrade5,
        _ => return None,
    })
}

#[wasm_bindgen]
impl Engine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Engine {
        let material_grade = MaterialGrade::Aluminum5083;
        let environment_config = EnvironmentConfig::default();
        Engine {
            ship: Ship::configured(material_grade, environment_config),
            // wave: Wave {
            //     significant_wave_height_m: 12.0,
            //     peak_period_s: 14.0,
            //     jonswap_gamma: 6.0,
            //     encounter_angle_deg: 0.0,
            //     slamming_probability: 0.65,
            //     time_scale: 2.0,
            // },
            wave: Wave {
                significant_wave_height_m: 1.0,
                peak_period_s: 0.01,
                jonswap_gamma: 3.3,
                encounter_angle_deg: 0.0,
                slamming_probability: 0.15,
                time_scale: 0.003,
            },
            motion: Motion::default(),
            material_grade,
            environment_config,
            frame: 0,
            simulation_time_s: 0.0,
        }
    }

    pub fn tick(&mut self) {
        self.frame += 1;
        self.simulation_time_s += 1.0 / 20.0; // 20 ticks/s
        self.wave.update_fatigue(&mut self.ship);
        self.motion.update(&mut self.ship, &self.wave, self.simulation_time_s);
    }

    pub fn get_stress(&self) -> String {
        let stress_map = self.wave.compute_stress(&self.ship.properties);
        let out: Vec<serde_json::Value> = stress_map
            .iter()
            .map(|(zone, stress)| serde_json::json!({
                "zone": format!("{:?}", zone),
                "stress_mpa": stress,
            }))
        .collect();
        serde_json::to_string(&out).unwrap()
    }

    pub fn get_plating(&self) -> String {
        let plates: Vec<PlateInfo> = self.ship.state.primary.plating_map
            .iter()
            .map(|p| PlateInfo {
                zone: format!("{:?}", p.zone),
                fatigue_life: p.fatigue_life,
                thickness_m: p.thickness_m,
            })
        .collect();
        serde_json::to_string(&plates).unwrap()
    }

    pub fn get_surface(&self) -> Vec<f32> {
        self.wave.sample_surface_grid(
            500.0, 128, self.simulation_time_s,
            1.2, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0,
        )
    }

    pub fn get_ship(&self) -> String {
        let s = &self.ship.state.primary.physical;
        let environment = &self.ship.state.environmental;
        let operational = &self.ship.properties.operational;
        serde_json::to_string(&serde_json::json!({
            "x": s.position[0],
            "y": s.position[1],
            "z": s.position[2],
            "vx": s.velocity[0],
            "vy": s.velocity[1],
            "vz": s.velocity[2],
            "heading": s.heading_rad,
            "pitch": s.pitch_rad,
            "roll": s.roll_rad,
            "mass_kg": operational.effective_mass_kg,
            "added_mass_kg": operational.added_mass_kg,
            "drag_coefficient": operational.drag_coefficient,
            "stability_factor": operational.stability_factor,
            "wave_load_factor": operational.wave_load_factor,
            "temperature_active": environment.temperature_active,
            "ice_accretion_active": environment.ice_accretion_active,
            "biofouling_active": environment.biofouling_active,
            "hull_temperature_c": environment.hull_temperature_c,
            "thermal_stress_index": environment.thermal_stress_index,
            "ice_mass_kg": environment.ice_mass_kg,
            "fouling_mass_kg": environment.fouling_mass_kg,
            "fouling_drag_penalty": environment.fouling_drag_penalty,
        })).unwrap()
    }

    pub fn reset_ship(&mut self) {
        self.ship = Ship::configured(self.material_grade, self.environment_config);
        self.frame = 0;
        self.simulation_time_s = 0.0;
    }

    pub fn configure(
        &mut self,
        material: &str,
        temperature: bool,
        ice_accretion: bool,
        biofouling: bool,
    ) {
        if let Some(grade) = parse_material_grade(material) {
            self.material_grade = grade;
        }
        self.environment_config = EnvironmentConfig {
            temperature,
            ice_accretion,
            biofouling,
        };
        self.reset_ship();
    }

    pub fn set_material(&mut self, material: &str) {
        if let Some(grade) = parse_material_grade(material) {
            self.material_grade = grade;
            self.reset_ship();
        }
    }

    pub fn set_environment(
        &mut self,
        temperature: bool,
        ice_accretion: bool,
        biofouling: bool,
    ) {
        self.environment_config = EnvironmentConfig {
            temperature,
            ice_accretion,
            biofouling,
        };
        self.reset_ship();
    }
}
