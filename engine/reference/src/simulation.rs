use crate::*;

pub fn simulation_loop(ship: &mut Ship, wave: &Wave) {
    wave.update_fatigue(ship);
}
