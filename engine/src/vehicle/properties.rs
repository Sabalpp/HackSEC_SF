use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MaterialGrade {
    MildSteelTemperate,
    MildSteelColdWeather,
    AH36,
    DH36,
    EH36,
    EH40,
    Al5083,
    Al5086,
    GRP,
    CFRP,
    TiGrade5,
}

impl MaterialGrade {
    pub fn all() -> &'static [MaterialGrade] {
        &[
            MaterialGrade::MildSteelTemperate,
            MaterialGrade::MildSteelColdWeather,
            MaterialGrade::AH36,
            MaterialGrade::DH36,
            MaterialGrade::EH36,
            MaterialGrade::EH40,
            MaterialGrade::Al5083,
            MaterialGrade::Al5086,
            MaterialGrade::GRP,
            MaterialGrade::CFRP,
            MaterialGrade::TiGrade5,
        ]
    }

    pub fn from_key(key: &str) -> Option<Self> {
        Some(match key {
            "mild_steel_temperate" | "MildSteelTemperate" => MaterialGrade::MildSteelTemperate,
            "mild_steel_cold_weather" | "MildSteelColdWeather" => {
                MaterialGrade::MildSteelColdWeather
            }
            "ah36" | "AH36" => MaterialGrade::AH36,
            "dh36" | "DH36" => MaterialGrade::DH36,
            "eh36" | "EH36" => MaterialGrade::EH36,
            "eh40" | "EH40" => MaterialGrade::EH40,
            "al5083" | "aluminum_5083" | "Al5083" => MaterialGrade::Al5083,
            "al5086" | "aluminum_5086" | "Al5086" => MaterialGrade::Al5086,
            "grp" | "GRP" => MaterialGrade::GRP,
            "cfrp" | "CFRP" => MaterialGrade::CFRP,
            "ti_grade5" | "titanium_grade5" | "TiGrade5" => MaterialGrade::TiGrade5,
            _ => return None,
        })
    }

    pub fn key(&self) -> &'static str {
        match self {
            MaterialGrade::MildSteelTemperate => "mild_steel_temperate",
            MaterialGrade::MildSteelColdWeather => "mild_steel_cold_weather",
            MaterialGrade::AH36 => "ah36",
            MaterialGrade::DH36 => "dh36",
            MaterialGrade::EH36 => "eh36",
            MaterialGrade::EH40 => "eh40",
            MaterialGrade::Al5083 => "al5083",
            MaterialGrade::Al5086 => "al5086",
            MaterialGrade::GRP => "grp",
            MaterialGrade::CFRP => "cfrp",
            MaterialGrade::TiGrade5 => "ti_grade5",
        }
    }

    pub fn profile(&self) -> MaterialProfile {
        match self {
            MaterialGrade::MildSteelTemperate => MaterialProfile {
                grade: *self,
                heat_threshold_c: 600.0,
                cold_threshold_c: Some(20.0),
                dust_coeff: Some(24.1),
                humidity_coeff: Some(0.03),
                salinity_coeff: Some(0.08),
                uv_coeff: None,
            },
            MaterialGrade::MildSteelColdWeather => MaterialProfile {
                grade: *self,
                heat_threshold_c: 600.0,
                cold_threshold_c: Some(20.0),
                dust_coeff: Some(24.1),
                humidity_coeff: Some(0.03),
                salinity_coeff: Some(0.08),
                uv_coeff: None,
            },
            MaterialGrade::AH36 => MaterialProfile {
                grade: *self,
                heat_threshold_c: 600.0,
                cold_threshold_c: Some(0.0),
                dust_coeff: Some(24.0),
                humidity_coeff: Some(1.28),
                salinity_coeff: Some(0.15),
                uv_coeff: None,
            },
            MaterialGrade::DH36 => MaterialProfile {
                grade: *self,
                heat_threshold_c: 600.0,
                cold_threshold_c: Some(-20.0),
                dust_coeff: Some(23.5),
                humidity_coeff: Some(1.28),
                salinity_coeff: Some(0.12),
                uv_coeff: None,
            },
            MaterialGrade::EH36 => MaterialProfile {
                grade: *self,
                heat_threshold_c: 600.0,
                cold_threshold_c: Some(-40.0),
                dust_coeff: Some(23.0),
                humidity_coeff: Some(1.28),
                salinity_coeff: Some(0.10),
                uv_coeff: None,
            },
            MaterialGrade::EH40 => MaterialProfile {
                grade: *self,
                heat_threshold_c: 650.0,
                cold_threshold_c: Some(-40.0),
                dust_coeff: Some(20.5),
                humidity_coeff: Some(0.85),
                salinity_coeff: Some(0.029),
                uv_coeff: None,
            },
            MaterialGrade::Al5083 => MaterialProfile {
                grade: *self,
                heat_threshold_c: 413.0,
                cold_threshold_c: None,
                dust_coeff: Some(15.8),
                humidity_coeff: Some(0.01),
                salinity_coeff: Some(0.002),
                uv_coeff: Some(0.01),
            },
            MaterialGrade::Al5086 => MaterialProfile {
                grade: *self,
                heat_threshold_c: 450.0,
                cold_threshold_c: None,
                dust_coeff: Some(14.5),
                humidity_coeff: Some(0.01),
                salinity_coeff: Some(0.003),
                uv_coeff: Some(0.01),
            },
            MaterialGrade::GRP => MaterialProfile {
                grade: *self,
                heat_threshold_c: 250.0,
                cold_threshold_c: Some(0.0),
                dust_coeff: Some(45.0),
                humidity_coeff: None,
                salinity_coeff: None,
                uv_coeff: Some(0.02),
            },
            MaterialGrade::CFRP => MaterialProfile {
                grade: *self,
                heat_threshold_c: 300.0,
                cold_threshold_c: Some(0.0),
                dust_coeff: Some(30.0),
                humidity_coeff: None,
                salinity_coeff: Some(0.01),
                uv_coeff: Some(0.28),
            },
            MaterialGrade::TiGrade5 => MaterialProfile {
                grade: *self,
                heat_threshold_c: 800.0,
                cold_threshold_c: None,
                dust_coeff: Some(0.00063),
                humidity_coeff: None,
                salinity_coeff: None,
                uv_coeff: None,
            },
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct MaterialProfile {
    pub grade: MaterialGrade,
    pub heat_threshold_c: f64,
    pub cold_threshold_c: Option<f64>,
    pub dust_coeff: Option<f64>,
    pub humidity_coeff: Option<f64>,
    pub salinity_coeff: Option<f64>,
    pub uv_coeff: Option<f64>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct EnvironmentalThresholds {
    pub engine_heat_c: f64,
    pub battery_heat_c: f64,
    pub hydraulics_heat_c: f64,
    pub engine_cold_c: Option<f64>,
    pub battery_cold_c: Option<f64>,
    pub hydraulics_cold_c: Option<f64>,
    pub sensors_humidity: f64,
    pub chassis_humidity: f64,
}

impl EnvironmentalThresholds {
    pub fn from_material_profile(profile: MaterialProfile) -> Self {
        Self {
            engine_heat_c: profile.heat_threshold_c,
            battery_heat_c: profile.heat_threshold_c,
            hydraulics_heat_c: profile.heat_threshold_c,
            engine_cold_c: profile.cold_threshold_c,
            battery_cold_c: profile.cold_threshold_c,
            hydraulics_cold_c: profile.cold_threshold_c,
            sensors_humidity: 0.0,
            chassis_humidity: 0.0,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct CoefficientMatrix {
    pub engine_heat: f64,
    pub engine_cold: f64,
    pub engine_dust: f64,
    pub battery_heat: f64,
    pub battery_cold: f64,
    pub battery_uv: f64,
    pub hydraulics_heat: f64,
    pub hydraulics_cold: f64,
    pub hydraulics_uv: f64,
    pub sensors_dust: f64,
    pub sensors_humidity: f64,
    pub sensors_uv: f64,
    pub chassis_humidity: f64,
    pub chassis_salinity: f64,
}

impl CoefficientMatrix {
    pub fn from_material_profile(profile: MaterialProfile) -> Self {
        let thermal_coeff = 1.0 / profile.heat_threshold_c.max(1.0);
        let cold_coeff = if profile.cold_threshold_c.is_some() {
            thermal_coeff
        } else {
            0.0
        };
        let dust = profile.dust_coeff.unwrap_or(0.0);
        let humidity = profile.humidity_coeff.unwrap_or(0.0);
        let salinity = profile.salinity_coeff.unwrap_or(0.0);
        let uv = profile.uv_coeff.unwrap_or(0.0);

        Self {
            engine_heat: thermal_coeff,
            engine_cold: cold_coeff,
            engine_dust: dust,
            battery_heat: thermal_coeff,
            battery_cold: cold_coeff,
            battery_uv: uv,
            hydraulics_heat: thermal_coeff,
            hydraulics_cold: cold_coeff,
            hydraulics_uv: uv,
            sensors_dust: dust,
            sensors_humidity: humidity,
            sensors_uv: uv,
            chassis_humidity: humidity,
            chassis_salinity: salinity,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VehicleProperties {
    pub material_grade: MaterialGrade,
    pub material_profile: MaterialProfile,
    pub thresholds: EnvironmentalThresholds,
    pub coefficients: CoefficientMatrix,
}

impl VehicleProperties {
    pub fn new(material_grade: MaterialGrade) -> Self {
        let material_profile = material_grade.profile();
        Self {
            material_grade,
            material_profile,
            thresholds: EnvironmentalThresholds::from_material_profile(material_profile),
            coefficients: CoefficientMatrix::from_material_profile(material_profile),
        }
    }
}
