use crate::*;

const FOULING_DENSITY_KG_M3: f64 = 1320.0;
const FOULING_LAYER_THICKNESS_M: f64 = 0.0028;

pub fn apply(ship: &mut Ship) {
    let props = &mut ship.properties;
    let state = &mut ship.state.environmental;
    let wetted_surface_area_m2 = props.hull_geometry.length_m
        * (props.hull_geometry.beam_m + 2.0 * props.hull_geometry.draft_m)
        * 1.18;
    let fouling_mass_kg =
        wetted_surface_area_m2 * FOULING_LAYER_THICKNESS_M * FOULING_DENSITY_KG_M3 * 0.45;
    let drag_penalty = 0.36;

    props.operational.added_mass_kg += fouling_mass_kg;
    props.operational.effective_mass_kg += fouling_mass_kg;
    props.operational.drag_coefficient *= 1.0 + drag_penalty;
    props.operational.hydrodynamic_damping_factor *= 1.12;
    props.operational.propulsion_efficiency_factor *= 0.86;
    props.operational.wave_load_factor *= 1.08;
    props.operational.fatigue_damage_multiplier *= 1.16;
    props.operational.structural_strength_factor *= 0.97;

    state.fouling_mass_kg = fouling_mass_kg;
    state.fouling_drag_penalty = drag_penalty;
}
