use crate::*;

const DESIGN_HULL_TEMP_C: f64 = 12.0;
const OPERATING_HULL_TEMP_C: f64 = -18.0;
const SERVICE_GAP_CLAMP_C: f64 = 50.0;

pub fn apply(ship: &mut Ship) {
    let props = &mut ship.properties;
    let state = &mut ship.state.environmental;
    let cold_delta_c = (DESIGN_HULL_TEMP_C - OPERATING_HULL_TEMP_C).max(0.0);
    let service_gap_c =
        (props.material_properties.min_service_temp_c - OPERATING_HULL_TEMP_C).max(0.0);
    let thermal_penalty = (service_gap_c / SERVICE_GAP_CLAMP_C).clamp(0.0, 1.0);
    let universal_penalty = (cold_delta_c / 40.0).clamp(0.0, 1.0);

    props.material_properties.fracture_toughness_mpa_sqrt_m *= 1.0 - thermal_penalty * 0.32;
    props.material_properties.youngs_modulus_gpa *= 1.0 + universal_penalty * 0.02;
    props.operational.hydrodynamic_damping_factor *= 1.0 + universal_penalty * 0.04;
    props.operational.propulsion_efficiency_factor *= 1.0 - universal_penalty * 0.05;
    props.operational.wave_load_factor *= 1.0 + universal_penalty * 0.06 + thermal_penalty * 0.1;
    props.operational.structural_strength_factor *= 1.0 - thermal_penalty * 0.22;
    props.operational.fatigue_damage_multiplier *=
        1.0 + universal_penalty * 0.08 + thermal_penalty * 0.24;
    props.operational.stability_factor *= 0.98;

    state.hull_temperature_c = OPERATING_HULL_TEMP_C;
    state.thermal_stress_index =
        (universal_penalty * 0.55 + thermal_penalty * 0.45).clamp(0.0, 1.0);
}
