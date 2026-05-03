use engine::{EnvironmentSample, Simulation};

fn main() {
    let mut simulation = Simulation::new();
    let state = simulation.tick(EnvironmentSample {
        temperature_c: 20.0,
        particulate_concentration: 0.0,
        relative_humidity: 0.0,
        salinity_concentration: 0.0,
        irradiance: 0.0,
    });

    println!("vehicle_health={:.3}", state.vehicle_health);
}
