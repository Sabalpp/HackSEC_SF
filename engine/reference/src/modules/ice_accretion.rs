use crate::*;

const ICE_DENSITY_KG_M3: f64 = 917.0;
const ICE_LAYER_THICKNESS_M: f64 = 0.0055;

pub fn apply(ship: &mut Ship) {
    let props = &mut ship.properties;
    let state = &mut ship.state.environmental;
    let exposed_area_m2 = props.hull_geometry.length_m
        * (props.hull_geometry.beam_m * 0.92 + props.hull_geometry.draft_m * 0.8);
    let ice_mass_kg = exposed_area_m2 * ICE_LAYER_THICKNESS_M * ICE_DENSITY_KG_M3 * 1.7;

    props.operational.added_mass_kg += ice_mass_kg;
    props.operational.effective_mass_kg += ice_mass_kg;
    props.operational.drag_coefficient *= 1.18;
    props.operational.hydrodynamic_damping_factor *= 1.05;
    props.operational.propulsion_efficiency_factor *= 0.91;
    props.operational.buoyancy_reserve_factor *= 0.88;
    props.operational.stability_factor *= 0.83;
    props.operational.pitch_inertia_factor *= 1.16;
    props.operational.roll_inertia_factor *= 1.24;
    props.operational.wave_load_factor *= 1.14;
    props.operational.fatigue_damage_multiplier *= 1.22;

    state.ice_mass_kg = ice_mass_kg;
    state.center_of_gravity_shift_m += 0.08;
}
