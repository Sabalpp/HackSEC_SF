use crate::*;


#[derive(Debug)]
pub struct Ship {
    pub properties: ShipProperties,
    pub state: ShipState,
}

impl Ship {
    pub fn configured(material_grade: MaterialGrade, environment: EnvironmentConfig) -> Self {
        let mut ship = Self {
            properties: ShipProperties::new(HullGeometry::default(), material_grade),
            state: ShipState::with_environment(environment),
        };
        ship.properties.environment = environment;
        apply_environmental_modules(&mut ship);
        ship
    }
}
