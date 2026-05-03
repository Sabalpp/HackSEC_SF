use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Deserialize, Clone)]
pub struct MaterialProperties {
    pub code: String,
    pub category: String,
    pub yield_strength_mpa: Option<f64>,
    pub ultimate_tensile_strength_mpa: f64,
    pub fracture_toughness_mpa_sqrt_m: f64,
    pub youngs_modulus_gpa: f64,
    pub density_kg_m3: f64,
    pub min_service_temp_c: f64,
    pub sn_curve: SnCurve,
}

#[derive(Debug, Deserialize, Clone)]
pub struct SnCurve {
    pub reference: String,
    pub slope_m: f64,
    pub fatigue_limit_mpa: Option<f64>,
    pub reference_cycles: u64,
}

#[derive(Debug, Deserialize)]
struct MaterialsFile {
    materials: HashMap<String, MaterialProperties>,
}

pub struct MaterialLibrary {
    pub materials: HashMap<String, MaterialProperties>,
}

impl MaterialLibrary {
    pub fn load() -> Self {
        let json = include_str!("../../data/materials.json");
        let file: MaterialsFile = serde_json::from_str(json).expect("failed to parse materials.json");
        Self { materials: file.materials }
    }

    pub fn get(&self, key: &str) -> &MaterialProperties {
        self.materials.get(key).unwrap_or_else(|| panic!("unknown material: {}", key))
    }
}

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize)]
pub struct EnvironmentConfig {
    pub temperature: bool,
    pub ice_accretion: bool,
    pub biofouling: bool,
}

#[derive(Debug, Clone, Copy)]
pub enum MaterialGrade {
    MildSteelTemperate,
    MildSteelColdWeather,
    HighStrengthAH36,
    HighStrengthDH36,
    HighStrengthEH36,
    UltraHighStrengthEH40,
    Aluminum5083,
    Aluminum5086,
    GRPFiberglass,
    CFRPCarbonFiber,
    TitaniumGrade5,
}

impl MaterialGrade {
    pub fn key(&self) -> &'static str {
        match self {
            MaterialGrade::MildSteelTemperate    => "mild_steel_A",
            MaterialGrade::MildSteelColdWeather  => "mild_steel_E",
            MaterialGrade::HighStrengthAH36      => "high_strength_AH36",
            MaterialGrade::HighStrengthDH36      => "high_strength_DH36",
            MaterialGrade::HighStrengthEH36      => "high_strength_EH36",
            MaterialGrade::UltraHighStrengthEH40 => "ultra_high_strength_EH40",
            MaterialGrade::Aluminum5083          => "aluminum_5083_H116",
            MaterialGrade::Aluminum5086          => "aluminum_5086_H116",
            MaterialGrade::GRPFiberglass         => "grp_e_glass",
            MaterialGrade::CFRPCarbonFiber       => "cfrp",
            MaterialGrade::TitaniumGrade5        => "titanium_grade5",
        }
    }
}

#[derive(Debug, Clone)]
pub struct HullGeometry {
    pub length_m: f64,
    pub beam_m: f64,
    pub draft_m: f64,
    pub block_coefficient: f64,
}

impl Default for HullGeometry {
    fn default() -> Self {
        Self {
            length_m: 7.32,
            beam_m: 2.4,
            draft_m: 0.33,
            block_coefficient: 0.6,
        }
    }
}

#[derive(Debug, Clone)]
pub struct OperationalProfile {
    pub baseline_mass_kg: f64,
    pub effective_mass_kg: f64,
    pub added_mass_kg: f64,
    pub drag_coefficient: f64,
    pub propulsion_efficiency_factor: f64,
    pub stability_factor: f64,
    pub buoyancy_reserve_factor: f64,
    pub hydrodynamic_damping_factor: f64,
    pub pitch_inertia_factor: f64,
    pub roll_inertia_factor: f64,
    pub structural_strength_factor: f64,
    pub wave_load_factor: f64,
    pub fatigue_damage_multiplier: f64,
}

impl OperationalProfile {
    pub fn baseline(hull_geometry: &HullGeometry, material_properties: &MaterialProperties) -> Self {
        let wetted_surface_area_m2 = hull_geometry.length_m
            * (hull_geometry.beam_m + 2.0 * hull_geometry.draft_m)
            * 1.18;
        let average_plating_thickness_m = 0.0048;
        let shell_mass_kg = wetted_surface_area_m2
            * average_plating_thickness_m
            * material_properties.density_kg_m3;
        let systems_mass_kg = 280.0 + hull_geometry.length_m * hull_geometry.beam_m * 24.0;
        let baseline_mass_kg = shell_mass_kg * 0.78 + systems_mass_kg;

        let (drag_coefficient, propulsion_efficiency_factor) =
            match material_properties.category.as_str() {
                "composite" => (0.74, 1.04),
                "aluminum_alloy" => (0.79, 1.0),
                "titanium_alloy" => (0.77, 0.98),
                "high_strength_steel" | "ultra_high_strength_steel" => (0.84, 0.95),
                _ => (0.87, 0.92),
            };

        Self {
            baseline_mass_kg,
            effective_mass_kg: baseline_mass_kg,
            added_mass_kg: 0.0,
            drag_coefficient,
            propulsion_efficiency_factor,
            stability_factor: 1.0,
            buoyancy_reserve_factor: 1.0,
            hydrodynamic_damping_factor: 1.0,
            pitch_inertia_factor: 1.0,
            roll_inertia_factor: 1.0,
            structural_strength_factor: 1.0,
            wave_load_factor: 1.0,
            fatigue_damage_multiplier: 1.0,
        }
    }
}

#[derive(Debug, Clone)]
pub struct ShipProperties {
    pub hull_geometry: HullGeometry,
    pub material_grade: MaterialGrade,
    pub material_properties: MaterialProperties,
    pub environment: EnvironmentConfig,
    pub operational: OperationalProfile,
}

impl ShipProperties {
    pub fn new(hull_geometry: HullGeometry, material_grade: MaterialGrade) -> Self {
        let material_library = MaterialLibrary::load();
        let material_properties = material_library.get(material_grade.key()).clone();
        let operational = OperationalProfile::baseline(&hull_geometry, &material_properties);

        Self {
            hull_geometry,
            material_grade,
            material_properties,
            environment: EnvironmentConfig::default(),
            operational,
        }
    }
}
