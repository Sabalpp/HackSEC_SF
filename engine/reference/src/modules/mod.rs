pub mod wave;
pub use wave::*;

pub mod motion;
pub use motion::*;

pub mod temperature;

pub mod ice_accretion;

pub mod biofouling;

use crate::*;

pub fn apply_environmental_modules(ship: &mut Ship) {
    if ship.properties.environment.temperature {
        temperature::apply(ship);
    }

    if ship.properties.environment.ice_accretion {
        ice_accretion::apply(ship);
    }

    if ship.properties.environment.biofouling {
        biofouling::apply(ship);
    }
}
