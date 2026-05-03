use serde::{Deserialize, Serialize};

const DUST_NEAR_ZERO: f64 = 0.00063;
const DUST_LOW: f64 = 1.0;
const DUST_MODERATE: f64 = 10.0;
const DUST_HIGH: f64 = 60.0;
const HUMIDITY_LOW: f64 = 0.01;
const HUMIDITY_MODERATE: f64 = 0.03;
const HUMIDITY_HIGH: f64 = 0.85;
const HUMIDITY_VERY_HIGH: f64 = 1.28;
const SALINITY_LOW: f64 = 0.01;
const SALINITY_HIGH: f64 = 0.15;
const UV_LOW: f64 = 0.01;
const UV_MODERATE: f64 = 0.02;
const UV_HIGH: f64 = 0.28;
const UV_VERY_HIGH: f64 = 0.56;
const COST_USD_PER_KG: &str = "USD/kg";
const COST_USD_PER_L: &str = "USD/L";

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
    RubberCompound,
    NitrileRubber,
    PolyurethaneCoating,
    Polyimide,
    Polypropylene,
    KevlarComposite,
    CeramicComposite,
    TungstenCarbide,
    StainlessSteel304,
    StainlessSteel316,
    ChromolySteel,
    CastIron,
    NickelAlloy625,
    Silicon,
    Germanium,
    GalliumArsenide,
    SapphireGlass,
    BorosilicateGlass,
    PhosphateEsterFluid,
    LithiumCompound,
    PiezoelectricCeramic,
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
            MaterialGrade::RubberCompound,
            MaterialGrade::NitrileRubber,
            MaterialGrade::PolyurethaneCoating,
            MaterialGrade::Polyimide,
            MaterialGrade::Polypropylene,
            MaterialGrade::KevlarComposite,
            MaterialGrade::CeramicComposite,
            MaterialGrade::TungstenCarbide,
            MaterialGrade::StainlessSteel304,
            MaterialGrade::StainlessSteel316,
            MaterialGrade::ChromolySteel,
            MaterialGrade::CastIron,
            MaterialGrade::NickelAlloy625,
            MaterialGrade::Silicon,
            MaterialGrade::Germanium,
            MaterialGrade::GalliumArsenide,
            MaterialGrade::SapphireGlass,
            MaterialGrade::BorosilicateGlass,
            MaterialGrade::PhosphateEsterFluid,
            MaterialGrade::LithiumCompound,
            MaterialGrade::PiezoelectricCeramic,
        ]
    }

    pub fn from_key(key: &str) -> Option<Self> {
        Some(match key {
            "mild_steel_temperate" | "MildSteelTemperate" => MaterialGrade::MildSteelTemperate,
            "mild_steel_cold_weather" | "MildSteelColdWeather" => {
                MaterialGrade::MildSteelColdWeather
            }
            "ah36" | "AH36" | "AH36Steel" => MaterialGrade::AH36,
            "dh36" | "DH36" | "DH36Steel" => MaterialGrade::DH36,
            "eh36" | "EH36" | "EH36Steel" => MaterialGrade::EH36,
            "eh40" | "EH40" | "EH40Steel" => MaterialGrade::EH40,
            "al5083" | "aluminum_5083" | "Al5083" | "Aluminum5083" => MaterialGrade::Al5083,
            "al5086" | "aluminum_5086" | "Al5086" | "Aluminum5086" => MaterialGrade::Al5086,
            "grp" | "GRP" | "GRPFiberglass" => MaterialGrade::GRP,
            "cfrp" | "CFRP" | "CFRPCarbonFiber" => MaterialGrade::CFRP,
            "ti_grade5" | "titanium_grade5" | "TiGrade5" | "TitaniumGrade5" => {
                MaterialGrade::TiGrade5
            }
            "rubber_compound" | "RubberCompound" => MaterialGrade::RubberCompound,
            "nitrile_rubber" | "NitrileRubber" => MaterialGrade::NitrileRubber,
            "polyurethane_coating" | "PolyurethaneCoating" => MaterialGrade::PolyurethaneCoating,
            "polyimide" | "Polyimide" => MaterialGrade::Polyimide,
            "polypropylene" | "Polypropylene" => MaterialGrade::Polypropylene,
            "kevlar_composite" | "KevlarComposite" => MaterialGrade::KevlarComposite,
            "ceramic_composite" | "CeramicComposite" => MaterialGrade::CeramicComposite,
            "tungsten_carbide" | "TungstenCarbide" => MaterialGrade::TungstenCarbide,
            "stainless_steel" | "stainless_steel_316" | "StainlessSteel" | "StainlessSteel316" => {
                MaterialGrade::StainlessSteel316
            }
            "stainless_steel_304" | "StainlessSteel304" => MaterialGrade::StainlessSteel304,
            "chromoly_steel" | "ChromolySteel" => MaterialGrade::ChromolySteel,
            "cast_iron" | "CastIron" => MaterialGrade::CastIron,
            "nickel_alloy" | "nickel_alloy_625" | "nickel_superalloy" | "NickelAlloy"
            | "NickelAlloy625" | "NickelSuperalloy" => MaterialGrade::NickelAlloy625,
            "silicon" | "Silicon" => MaterialGrade::Silicon,
            "germanium" | "Germanium" => MaterialGrade::Germanium,
            "gallium_arsenide" | "GalliumArsenide" => MaterialGrade::GalliumArsenide,
            "sapphire_glass" | "SapphireGlass" => MaterialGrade::SapphireGlass,
            "borosilicate_glass" | "BorosilicateGlass" => MaterialGrade::BorosilicateGlass,
            "phosphate_ester_fluid" | "PhosphateEsterFluid" => MaterialGrade::PhosphateEsterFluid,
            "lithium_compound" | "LithiumCompound" => MaterialGrade::LithiumCompound,
            "piezoelectric_ceramic" | "PiezoelectricCeramic" => MaterialGrade::PiezoelectricCeramic,
            _ => return from_normalized_material_key(key),
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
            MaterialGrade::RubberCompound => "rubber_compound",
            MaterialGrade::NitrileRubber => "nitrile_rubber",
            MaterialGrade::PolyurethaneCoating => "polyurethane_coating",
            MaterialGrade::Polyimide => "polyimide",
            MaterialGrade::Polypropylene => "polypropylene",
            MaterialGrade::KevlarComposite => "kevlar_composite",
            MaterialGrade::CeramicComposite => "ceramic_composite",
            MaterialGrade::TungstenCarbide => "tungsten_carbide",
            MaterialGrade::StainlessSteel304 => "stainless_steel_304",
            MaterialGrade::StainlessSteel316 => "stainless_steel_316",
            MaterialGrade::ChromolySteel => "chromoly_steel",
            MaterialGrade::CastIron => "cast_iron",
            MaterialGrade::NickelAlloy625 => "nickel_alloy_625",
            MaterialGrade::Silicon => "silicon",
            MaterialGrade::Germanium => "germanium",
            MaterialGrade::GalliumArsenide => "gallium_arsenide",
            MaterialGrade::SapphireGlass => "sapphire_glass",
            MaterialGrade::BorosilicateGlass => "borosilicate_glass",
            MaterialGrade::PhosphateEsterFluid => "phosphate_ester_fluid",
            MaterialGrade::LithiumCompound => "lithium_compound",
            MaterialGrade::PiezoelectricCeramic => "piezoelectric_ceramic",
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
            MaterialGrade::RubberCompound => MaterialProfile {
                grade: *self,
                heat_threshold_c: 110.0,
                cold_threshold_c: Some(-45.0),
                dust_coeff: None,
                humidity_coeff: Some(HUMIDITY_MODERATE),
                salinity_coeff: None,
                uv_coeff: Some(UV_HIGH),
            },
            MaterialGrade::NitrileRubber => MaterialProfile {
                grade: *self,
                heat_threshold_c: 120.0,
                cold_threshold_c: Some(-40.0),
                dust_coeff: None,
                humidity_coeff: Some(HUMIDITY_LOW),
                salinity_coeff: None,
                uv_coeff: Some(UV_HIGH),
            },
            MaterialGrade::PolyurethaneCoating => MaterialProfile {
                grade: *self,
                heat_threshold_c: 120.0,
                cold_threshold_c: Some(-50.0),
                dust_coeff: Some(0.05),
                humidity_coeff: Some(HUMIDITY_MODERATE),
                salinity_coeff: None,
                uv_coeff: Some(UV_MODERATE),
            },
            MaterialGrade::Polyimide => MaterialProfile {
                grade: *self,
                heat_threshold_c: 260.0,
                cold_threshold_c: Some(-200.0),
                dust_coeff: None,
                humidity_coeff: Some(HUMIDITY_HIGH),
                salinity_coeff: None,
                uv_coeff: Some(UV_LOW),
            },
            MaterialGrade::Polypropylene => MaterialProfile {
                grade: *self,
                heat_threshold_c: 100.0,
                cold_threshold_c: Some(0.0),
                dust_coeff: None,
                humidity_coeff: Some(HUMIDITY_LOW),
                salinity_coeff: None,
                uv_coeff: Some(UV_VERY_HIGH),
            },
            MaterialGrade::KevlarComposite => MaterialProfile {
                grade: *self,
                heat_threshold_c: 177.0,
                cold_threshold_c: Some(-196.0),
                dust_coeff: None,
                humidity_coeff: Some(HUMIDITY_MODERATE),
                salinity_coeff: None,
                uv_coeff: Some(UV_HIGH),
            },
            MaterialGrade::CeramicComposite => MaterialProfile {
                grade: *self,
                heat_threshold_c: 950.0,
                cold_threshold_c: None,
                dust_coeff: Some(DUST_NEAR_ZERO),
                humidity_coeff: None,
                salinity_coeff: None,
                uv_coeff: None,
            },
            MaterialGrade::TungstenCarbide => MaterialProfile {
                grade: *self,
                heat_threshold_c: 500.0,
                cold_threshold_c: None,
                dust_coeff: Some(7.4),
                humidity_coeff: None,
                salinity_coeff: Some(SALINITY_LOW),
                uv_coeff: None,
            },
            MaterialGrade::StainlessSteel304 => MaterialProfile {
                grade: *self,
                heat_threshold_c: 870.0,
                cold_threshold_c: None,
                dust_coeff: Some(DUST_MODERATE),
                humidity_coeff: Some(HUMIDITY_LOW),
                salinity_coeff: Some(4.65),
                uv_coeff: None,
            },
            MaterialGrade::StainlessSteel316 => MaterialProfile {
                grade: *self,
                heat_threshold_c: 870.0,
                cold_threshold_c: None,
                dust_coeff: Some(DUST_MODERATE),
                humidity_coeff: Some(HUMIDITY_LOW),
                salinity_coeff: Some(1.98),
                uv_coeff: None,
            },
            MaterialGrade::ChromolySteel => MaterialProfile {
                grade: *self,
                heat_threshold_c: 540.0,
                cold_threshold_c: None,
                dust_coeff: Some(DUST_HIGH),
                humidity_coeff: Some(HUMIDITY_HIGH),
                salinity_coeff: Some(SALINITY_HIGH),
                uv_coeff: None,
            },
            MaterialGrade::CastIron => MaterialProfile {
                grade: *self,
                heat_threshold_c: 600.0,
                cold_threshold_c: None,
                dust_coeff: Some(125.0),
                humidity_coeff: Some(HUMIDITY_HIGH),
                salinity_coeff: Some(SALINITY_HIGH),
                uv_coeff: None,
            },
            MaterialGrade::NickelAlloy625 => MaterialProfile {
                grade: *self,
                heat_threshold_c: 980.0,
                cold_threshold_c: None,
                dust_coeff: Some(DUST_LOW),
                humidity_coeff: Some(HUMIDITY_LOW),
                salinity_coeff: Some(0.061),
                uv_coeff: None,
            },
            MaterialGrade::Silicon => MaterialProfile {
                grade: *self,
                heat_threshold_c: 1414.0,
                cold_threshold_c: None,
                dust_coeff: Some(DUST_LOW),
                humidity_coeff: Some(HUMIDITY_LOW),
                salinity_coeff: None,
                uv_coeff: Some(UV_LOW),
            },
            MaterialGrade::Germanium => MaterialProfile {
                grade: *self,
                heat_threshold_c: 938.0,
                cold_threshold_c: None,
                dust_coeff: Some(DUST_LOW),
                humidity_coeff: Some(HUMIDITY_LOW),
                salinity_coeff: None,
                uv_coeff: Some(UV_LOW),
            },
            MaterialGrade::GalliumArsenide => MaterialProfile {
                grade: *self,
                heat_threshold_c: 627.0,
                cold_threshold_c: None,
                dust_coeff: Some(DUST_LOW),
                humidity_coeff: Some(HUMIDITY_LOW),
                salinity_coeff: None,
                uv_coeff: Some(UV_LOW),
            },
            MaterialGrade::SapphireGlass => MaterialProfile {
                grade: *self,
                heat_threshold_c: 2040.0,
                cold_threshold_c: None,
                dust_coeff: Some(DUST_NEAR_ZERO),
                humidity_coeff: Some(HUMIDITY_LOW),
                salinity_coeff: None,
                uv_coeff: Some(UV_LOW),
            },
            MaterialGrade::BorosilicateGlass => MaterialProfile {
                grade: *self,
                heat_threshold_c: 820.0,
                cold_threshold_c: None,
                dust_coeff: Some(DUST_MODERATE),
                humidity_coeff: Some(HUMIDITY_HIGH),
                salinity_coeff: None,
                uv_coeff: Some(UV_LOW),
            },
            MaterialGrade::PhosphateEsterFluid => MaterialProfile {
                grade: *self,
                heat_threshold_c: 120.0,
                cold_threshold_c: None,
                dust_coeff: None,
                humidity_coeff: Some(HUMIDITY_VERY_HIGH),
                salinity_coeff: None,
                uv_coeff: None,
            },
            MaterialGrade::LithiumCompound => MaterialProfile {
                grade: *self,
                heat_threshold_c: 218.0,
                cold_threshold_c: None,
                dust_coeff: None,
                humidity_coeff: Some(HUMIDITY_MODERATE),
                salinity_coeff: None,
                uv_coeff: None,
            },
            MaterialGrade::PiezoelectricCeramic => MaterialProfile {
                grade: *self,
                heat_threshold_c: 200.0,
                cold_threshold_c: None,
                dust_coeff: Some(DUST_LOW),
                humidity_coeff: Some(HUMIDITY_HIGH),
                salinity_coeff: None,
                uv_coeff: None,
            },
        }
    }

    fn commercial_metadata(&self) -> MaterialCommercialMetadata {
        match self {
            MaterialGrade::MildSteelTemperate => MaterialCommercialMetadata {
                strength_index: 0.30,
                cost: 1.00,
                cost_unit: COST_USD_PER_KG,
            },
            MaterialGrade::MildSteelColdWeather => MaterialCommercialMetadata {
                strength_index: 0.30,
                cost: 1.00,
                cost_unit: COST_USD_PER_KG,
            },
            MaterialGrade::AH36 => MaterialCommercialMetadata {
                strength_index: 0.52,
                cost: 1.50,
                cost_unit: COST_USD_PER_KG,
            },
            MaterialGrade::DH36 => MaterialCommercialMetadata {
                strength_index: 0.52,
                cost: 1.50,
                cost_unit: COST_USD_PER_KG,
            },
            MaterialGrade::EH36 => MaterialCommercialMetadata {
                strength_index: 0.52,
                cost: 1.50,
                cost_unit: COST_USD_PER_KG,
            },
            MaterialGrade::EH40 => MaterialCommercialMetadata {
                strength_index: 0.58,
                cost: 2.00,
                cost_unit: COST_USD_PER_KG,
            },
            MaterialGrade::Al5083 => MaterialCommercialMetadata {
                strength_index: 0.38,
                cost: 4.00,
                cost_unit: COST_USD_PER_KG,
            },
            MaterialGrade::Al5086 => MaterialCommercialMetadata {
                strength_index: 0.38,
                cost: 4.00,
                cost_unit: COST_USD_PER_KG,
            },
            MaterialGrade::GRP => MaterialCommercialMetadata {
                strength_index: 0.40,
                cost: 15.00,
                cost_unit: COST_USD_PER_KG,
            },
            MaterialGrade::CFRP => MaterialCommercialMetadata {
                strength_index: 0.68,
                cost: 37.50,
                cost_unit: COST_USD_PER_KG,
            },
            MaterialGrade::TiGrade5 => MaterialCommercialMetadata {
                strength_index: 0.82,
                cost: 112.50,
                cost_unit: COST_USD_PER_KG,
            },
            MaterialGrade::RubberCompound => MaterialCommercialMetadata {
                strength_index: 0.03,
                cost: 3.50,
                cost_unit: COST_USD_PER_KG,
            },
            MaterialGrade::NitrileRubber => MaterialCommercialMetadata {
                strength_index: 0.03,
                cost: 4.50,
                cost_unit: COST_USD_PER_KG,
            },
            MaterialGrade::PolyurethaneCoating => MaterialCommercialMetadata {
                strength_index: 0.05,
                cost: 15.00,
                cost_unit: COST_USD_PER_KG,
            },
            MaterialGrade::Polyimide => MaterialCommercialMetadata {
                strength_index: 0.08,
                cost: 115.00,
                cost_unit: COST_USD_PER_KG,
            },
            MaterialGrade::Polypropylene => MaterialCommercialMetadata {
                strength_index: 0.04,
                cost: 2.25,
                cost_unit: COST_USD_PER_KG,
            },
            MaterialGrade::KevlarComposite => MaterialCommercialMetadata {
                strength_index: 0.60,
                cost: 45.00,
                cost_unit: COST_USD_PER_KG,
            },
            MaterialGrade::CeramicComposite => MaterialCommercialMetadata {
                strength_index: 0.72,
                cost: 85.00,
                cost_unit: COST_USD_PER_KG,
            },
            MaterialGrade::TungstenCarbide => MaterialCommercialMetadata {
                strength_index: 0.88,
                cost: 66.50,
                cost_unit: COST_USD_PER_KG,
            },
            MaterialGrade::StainlessSteel304 => MaterialCommercialMetadata {
                strength_index: 0.45,
                cost: 4.00,
                cost_unit: COST_USD_PER_KG,
            },
            MaterialGrade::StainlessSteel316 => MaterialCommercialMetadata {
                strength_index: 0.48,
                cost: 5.00,
                cost_unit: COST_USD_PER_KG,
            },
            MaterialGrade::ChromolySteel => MaterialCommercialMetadata {
                strength_index: 0.65,
                cost: 3.00,
                cost_unit: COST_USD_PER_KG,
            },
            MaterialGrade::CastIron => MaterialCommercialMetadata {
                strength_index: 0.35,
                cost: 1.25,
                cost_unit: COST_USD_PER_KG,
            },
            MaterialGrade::NickelAlloy625 => MaterialCommercialMetadata {
                strength_index: 0.78,
                cost: 42.50,
                cost_unit: COST_USD_PER_KG,
            },
            MaterialGrade::Silicon => MaterialCommercialMetadata {
                strength_index: 0.12,
                cost: 20.00,
                cost_unit: COST_USD_PER_KG,
            },
            MaterialGrade::Germanium => MaterialCommercialMetadata {
                strength_index: 0.10,
                cost: 1340.00,
                cost_unit: COST_USD_PER_KG,
            },
            MaterialGrade::GalliumArsenide => MaterialCommercialMetadata {
                strength_index: 0.10,
                cost: 2269.40,
                cost_unit: COST_USD_PER_KG,
            },
            MaterialGrade::SapphireGlass => MaterialCommercialMetadata {
                strength_index: 0.65,
                cost: 150.00,
                cost_unit: COST_USD_PER_KG,
            },
            MaterialGrade::BorosilicateGlass => MaterialCommercialMetadata {
                strength_index: 0.20,
                cost: 22.50,
                cost_unit: COST_USD_PER_KG,
            },
            MaterialGrade::PhosphateEsterFluid => MaterialCommercialMetadata {
                strength_index: 0.00,
                cost: 20.00,
                cost_unit: COST_USD_PER_L,
            },
            MaterialGrade::LithiumCompound => MaterialCommercialMetadata {
                strength_index: 0.00,
                cost: 40.00,
                cost_unit: COST_USD_PER_KG,
            },
            MaterialGrade::PiezoelectricCeramic => MaterialCommercialMetadata {
                strength_index: 0.15,
                cost: 225.00,
                cost_unit: COST_USD_PER_KG,
            },
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub struct MaterialCatalogEntry {
    grade: &'static str,
    label: &'static str,
    material_grade: MaterialGrade,
}

impl MaterialCatalogEntry {
    pub fn metadata(&self) -> MaterialMetadata {
        let profile = self.material_grade.profile();
        let commercial = self.material_grade.commercial_metadata();
        MaterialMetadata {
            grade: self.grade,
            label: self.label,
            strength_index: commercial.strength_index,
            cost: commercial.cost,
            cost_unit: commercial.cost_unit,
            heat_threshold_c: profile.heat_threshold_c,
            cold_threshold_c: profile.cold_threshold_c,
            dust_coeff: profile.dust_coeff,
            humidity_coeff: profile.humidity_coeff,
            salinity_coeff: profile.salinity_coeff,
            uv_coeff: profile.uv_coeff,
        }
    }
}

#[derive(Debug, Clone, Copy)]
struct MaterialCommercialMetadata {
    strength_index: f64,
    cost: f64,
    cost_unit: &'static str,
}

#[derive(Debug, Clone, Serialize)]
pub struct MaterialMetadata {
    pub grade: &'static str,
    pub label: &'static str,
    pub strength_index: f64,
    pub cost: f64,
    pub cost_unit: &'static str,
    pub heat_threshold_c: f64,
    pub cold_threshold_c: Option<f64>,
    pub dust_coeff: Option<f64>,
    pub humidity_coeff: Option<f64>,
    pub salinity_coeff: Option<f64>,
    pub uv_coeff: Option<f64>,
}

pub fn material_catalog() -> &'static [MaterialCatalogEntry] {
    &[
        MaterialCatalogEntry {
            grade: "MildSteelTemperate",
            label: "Mild Steel (temperate)",
            material_grade: MaterialGrade::MildSteelTemperate,
        },
        MaterialCatalogEntry {
            grade: "MildSteelColdWeather",
            label: "Mild Steel (cold weather)",
            material_grade: MaterialGrade::MildSteelColdWeather,
        },
        MaterialCatalogEntry {
            grade: "AH36",
            label: "AH36 Steel",
            material_grade: MaterialGrade::AH36,
        },
        MaterialCatalogEntry {
            grade: "DH36",
            label: "DH36 Steel",
            material_grade: MaterialGrade::DH36,
        },
        MaterialCatalogEntry {
            grade: "EH36",
            label: "EH36 Steel",
            material_grade: MaterialGrade::EH36,
        },
        MaterialCatalogEntry {
            grade: "EH40",
            label: "EH40 Steel",
            material_grade: MaterialGrade::EH40,
        },
        MaterialCatalogEntry {
            grade: "Al5083",
            label: "Aluminum 5083",
            material_grade: MaterialGrade::Al5083,
        },
        MaterialCatalogEntry {
            grade: "Al5086",
            label: "Aluminum 5086",
            material_grade: MaterialGrade::Al5086,
        },
        MaterialCatalogEntry {
            grade: "GRP",
            label: "GRP Fiberglass",
            material_grade: MaterialGrade::GRP,
        },
        MaterialCatalogEntry {
            grade: "CFRP",
            label: "CFRP Carbon Fiber",
            material_grade: MaterialGrade::CFRP,
        },
        MaterialCatalogEntry {
            grade: "TiGrade5",
            label: "Titanium Grade 5",
            material_grade: MaterialGrade::TiGrade5,
        },
        MaterialCatalogEntry {
            grade: "KevlarComposite",
            label: "Kevlar Composite",
            material_grade: MaterialGrade::KevlarComposite,
        },
        MaterialCatalogEntry {
            grade: "CeramicComposite",
            label: "Ceramic Composite",
            material_grade: MaterialGrade::CeramicComposite,
        },
        MaterialCatalogEntry {
            grade: "PolyurethaneCoating",
            label: "Polyurethane Coating",
            material_grade: MaterialGrade::PolyurethaneCoating,
        },
        MaterialCatalogEntry {
            grade: "TungstenCarbide",
            label: "Tungsten Carbide",
            material_grade: MaterialGrade::TungstenCarbide,
        },
        MaterialCatalogEntry {
            grade: "RubberCompound",
            label: "Rubber Compound",
            material_grade: MaterialGrade::RubberCompound,
        },
        MaterialCatalogEntry {
            grade: "Germanium",
            label: "Germanium",
            material_grade: MaterialGrade::Germanium,
        },
        MaterialCatalogEntry {
            grade: "SapphireGlass",
            label: "Sapphire Glass",
            material_grade: MaterialGrade::SapphireGlass,
        },
        MaterialCatalogEntry {
            grade: "Polyimide",
            label: "Polyimide",
            material_grade: MaterialGrade::Polyimide,
        },
        MaterialCatalogEntry {
            grade: "GalliumArsenide",
            label: "Gallium Arsenide",
            material_grade: MaterialGrade::GalliumArsenide,
        },
        MaterialCatalogEntry {
            grade: "PiezoelectricCeramic",
            label: "Piezoelectric Ceramic",
            material_grade: MaterialGrade::PiezoelectricCeramic,
        },
        MaterialCatalogEntry {
            grade: "Silicon",
            label: "Silicon",
            material_grade: MaterialGrade::Silicon,
        },
        MaterialCatalogEntry {
            grade: "BorosilicateGlass",
            label: "Borosilicate Glass",
            material_grade: MaterialGrade::BorosilicateGlass,
        },
        MaterialCatalogEntry {
            grade: "LithiumCompound",
            label: "Lithium Compound",
            material_grade: MaterialGrade::LithiumCompound,
        },
        MaterialCatalogEntry {
            grade: "NickelAlloy",
            label: "Nickel Alloy",
            material_grade: MaterialGrade::NickelAlloy625,
        },
        MaterialCatalogEntry {
            grade: "Polypropylene",
            label: "Polypropylene",
            material_grade: MaterialGrade::Polypropylene,
        },
        MaterialCatalogEntry {
            grade: "CastIron",
            label: "Cast Iron",
            material_grade: MaterialGrade::CastIron,
        },
        MaterialCatalogEntry {
            grade: "NickelSuperalloy",
            label: "Nickel Superalloy",
            material_grade: MaterialGrade::NickelAlloy625,
        },
        MaterialCatalogEntry {
            grade: "ChromolySteel",
            label: "Chromoly Steel",
            material_grade: MaterialGrade::ChromolySteel,
        },
        MaterialCatalogEntry {
            grade: "NitrileRubber",
            label: "Nitrile Rubber",
            material_grade: MaterialGrade::NitrileRubber,
        },
        MaterialCatalogEntry {
            grade: "StainlessSteel",
            label: "Stainless Steel",
            material_grade: MaterialGrade::StainlessSteel316,
        },
        MaterialCatalogEntry {
            grade: "PhosphateEsterFluid",
            label: "Phosphate Ester Fluid",
            material_grade: MaterialGrade::PhosphateEsterFluid,
        },
    ]
}

fn from_normalized_material_key(key: &str) -> Option<MaterialGrade> {
    let normalized = key
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .flat_map(|c| c.to_lowercase())
        .collect::<String>();

    Some(match normalized.as_str() {
        "mildsteeltemperate" => MaterialGrade::MildSteelTemperate,
        "mildsteelcoldweather" => MaterialGrade::MildSteelColdWeather,
        "ah36" | "ah36steel" | "highstrengthah36" => MaterialGrade::AH36,
        "dh36" | "dh36steel" | "highstrengthdh36" => MaterialGrade::DH36,
        "eh36" | "eh36steel" | "highstrengtheh36" => MaterialGrade::EH36,
        "eh40" | "eh40steel" | "ultrahighstrengtheh40" => MaterialGrade::EH40,
        "al5083" | "aluminum5083" => MaterialGrade::Al5083,
        "al5086" | "aluminum5086" => MaterialGrade::Al5086,
        "grp" | "grpfiberglass" => MaterialGrade::GRP,
        "cfrp" | "cfrpcarbonfiber" => MaterialGrade::CFRP,
        "tigrade5" | "titaniumgrade5" => MaterialGrade::TiGrade5,
        "rubbercompound" => MaterialGrade::RubberCompound,
        "nitrilerubber" => MaterialGrade::NitrileRubber,
        "polyurethanecoating" => MaterialGrade::PolyurethaneCoating,
        "polyimide" => MaterialGrade::Polyimide,
        "polypropylene" => MaterialGrade::Polypropylene,
        "kevlarcomposite" => MaterialGrade::KevlarComposite,
        "ceramiccomposite" => MaterialGrade::CeramicComposite,
        "tungstencarbide" => MaterialGrade::TungstenCarbide,
        "stainlesssteel" | "stainlesssteel316" => MaterialGrade::StainlessSteel316,
        "stainlesssteel304" => MaterialGrade::StainlessSteel304,
        "chromolysteel" => MaterialGrade::ChromolySteel,
        "castiron" => MaterialGrade::CastIron,
        "nickelalloy" | "nickelalloy625" | "nickelsuperalloy" => MaterialGrade::NickelAlloy625,
        "silicon" => MaterialGrade::Silicon,
        "germanium" => MaterialGrade::Germanium,
        "galliumarsenide" => MaterialGrade::GalliumArsenide,
        "sapphireglass" => MaterialGrade::SapphireGlass,
        "borosilicateglass" => MaterialGrade::BorosilicateGlass,
        "phosphateesterfluid" => MaterialGrade::PhosphateEsterFluid,
        "lithiumcompound" => MaterialGrade::LithiumCompound,
        "piezoelectricceramic" => MaterialGrade::PiezoelectricCeramic,
        _ => return None,
    })
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
