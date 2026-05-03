use crate::ship::properties::EnvironmentConfig;

#[derive(Debug, Clone)]
pub struct PhysicalState {
    pub position: [f64; 3],
    pub velocity: [f64; 3],
    pub acceleration: [f64; 3],
    pub heading_rad: f64,       // yaw (around y)
    pub pitch_rad: f64,         // around x (bow up / bow down)
    pub roll_rad: f64,          // around z (port / stbd)
    pub angular_velocity: f64,  // yaw rate
    pub pitch_rate: f64,
    pub roll_rate: f64,
}

#[derive(Debug, Clone, Hash, PartialEq, Eq)]
pub enum HullZone {
    LowerBow,
    LowerMidship,
    LowerStern,
    UpperBow,
    UpperMidship,
    UpperStern,
    Keel,
    Deck,
    Transom,
}

#[derive(Debug, Clone)]
pub struct PlateZone {
    pub zone: HullZone,
    pub thickness_m: f64,
    pub fatigue_life: f64, // 1.0 = brand new, 0.0 = failure likely
}

#[derive(Debug, Clone)]
pub struct Crack {
    pub location: [f64; 3],
    pub length_m: f64,
}

#[derive(Debug, Clone)]
pub struct PrimaryState {
    pub physical: PhysicalState,
    pub plating_map: Vec<PlateZone>,
    pub crack_state: Vec<Crack>,
}

#[derive(Debug, Clone)]
pub struct EnvironmentalState {
    pub temperature_active: bool,
    pub ice_accretion_active: bool,
    pub biofouling_active: bool,
    pub hull_temperature_c: f64,
    pub thermal_stress_index: f64,
    pub ice_mass_kg: f64,
    pub fouling_mass_kg: f64,
    pub fouling_drag_penalty: f64,
    pub center_of_gravity_shift_m: f64,
}

impl EnvironmentalState {
    pub fn from_config(config: EnvironmentConfig) -> Self {
        Self {
            temperature_active: config.temperature,
            ice_accretion_active: config.ice_accretion,
            biofouling_active: config.biofouling,
            hull_temperature_c: 15.0,
            thermal_stress_index: 0.0,
            ice_mass_kg: 0.0,
            fouling_mass_kg: 0.0,
            fouling_drag_penalty: 0.0,
            center_of_gravity_shift_m: 0.0,
        }
    }
}

#[derive(Debug, Clone)]
pub struct ShipState {
    pub primary: PrimaryState,
    pub environmental: EnvironmentalState,
}

impl ShipState {
    pub fn new() -> Self {
        Self::with_environment(EnvironmentConfig::default())
    }

    pub fn with_environment(config: EnvironmentConfig) -> Self {
        Self {
            primary: PrimaryState {
                physical: PhysicalState {
                    position: [0.0, 0.0, 0.0],
                    velocity: [0.0, 0.0, 0.0],
                    acceleration: [0.0, 0.0, 0.0],
                    heading_rad: 0.0,
                    pitch_rad: 0.0,
                    roll_rad: 0.0,
                    angular_velocity: 0.0,
                    pitch_rate: 0.0,
                    roll_rate: 0.0,
                },
                plating_map: vec![
                    PlateZone { zone: HullZone::LowerBow,     thickness_m: 0.005, fatigue_life: 1.0 },
                    PlateZone { zone: HullZone::LowerMidship, thickness_m: 0.005, fatigue_life: 1.0 },
                    PlateZone { zone: HullZone::LowerStern,   thickness_m: 0.005, fatigue_life: 1.0 },
                    PlateZone { zone: HullZone::UpperBow,     thickness_m: 0.004, fatigue_life: 1.0 },
                    PlateZone { zone: HullZone::UpperMidship, thickness_m: 0.004, fatigue_life: 1.0 },
                    PlateZone { zone: HullZone::UpperStern,   thickness_m: 0.004, fatigue_life: 1.0 },
                    PlateZone { zone: HullZone::Keel,         thickness_m: 0.006, fatigue_life: 1.0 },
                    PlateZone { zone: HullZone::Deck,         thickness_m: 0.003, fatigue_life: 1.0 },
                    PlateZone { zone: HullZone::Transom,      thickness_m: 0.005, fatigue_life: 1.0 },
                ],
                crack_state: Vec::new(),
            },
            environmental: EnvironmentalState::from_config(config),
        }
    }
}
