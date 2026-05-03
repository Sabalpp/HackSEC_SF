use crate::*;

#[derive(Debug, Clone)]
pub struct Vehicle {
    pub properties: VehicleProperties,
    pub state: VehicleState,
}

impl Vehicle {
    pub fn configured(material_grade: MaterialGrade) -> Self {
        Self {
            properties: VehicleProperties::new(material_grade),
            state: VehicleState::default(),
        }
    }
}
