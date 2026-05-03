use crate::*;

// 20 ticks/s — matches Engine::tick() in lib.rs
const DT_S: f64 = 1.0 / 20.0;

// Heave: spring pulling ship toward wave surface, with damping.
// Natural period ~ 2*PI / sqrt(K_HEAVE).  K=4.0 -> ~3.1s, decent small-boat feel.
const K_HEAVE: f64 = 4.0;
const C_HEAVE: f64 = 2.6; // roughly 2*zeta*sqrt(K); zeta ~ 0.65 -> settles without ringing

// Pitch/roll: stiffer restoring moments so the boat snaps to the slope under it
// but with real damping so it doesn't oscillate forever.
const K_PITCH: f64 = 9.0;
const C_PITCH: f64 = 3.6;
const K_ROLL: f64 = 7.0;
const C_ROLL: f64 = 3.2;

// Clamp pitch/roll so we can't flip the ship from a single bad sample.
const MAX_PITCH_RAD: f64 = 0.45; // ~26 deg
const MAX_ROLL_RAD: f64 = 0.55;  // ~31 deg

pub struct Motion {
    pub damping: f64,
}

impl Default for Motion {
    fn default() -> Self {
        Self { damping: 0.85 }
    }
}

impl Motion {
    pub fn update(&self, ship: &mut Ship, wave: &Wave, t: f64) {
        let (half_length, half_beam) = {
            let g = &ship.properties.hull_geometry;
            (g.length_m * 0.5, g.beam_m * 0.5)
        };

        // Pick a grid spacing that matches the hull scale so component wavelengths
        // stay resolved relative to the ship.
        let grid_spacing = (half_length * 0.5).max(0.5);
        let components = wave.default_components(grid_spacing);

        // Ship-local axes: +x forward (bow), +z starboard. Heading rotates them in the world.
        let h = ship.state.primary.physical.heading_rad;
        let (sin_h, cos_h) = (h.sin(), h.cos());
        let cx = ship.state.primary.physical.position[0];
        let cz = ship.state.primary.physical.position[2];

        // Sample five points: center, bow, stern, port, starboard.
        let sample = |local_x: f64, local_z: f64| -> f64 {
            let wx = cx + local_x * cos_h - local_z * sin_h;
            let wz = cz + local_x * sin_h + local_z * cos_h;
            wave.sample_surface_point(wx, wz, t, &components).height
        };

        let h_center = sample(0.0, 0.0);
        let h_bow = sample(half_length, 0.0);
        let h_stern = sample(-half_length, 0.0);
        let h_port = sample(0.0, -half_beam);
        let h_stbd = sample(0.0, half_beam);

        // --- Heave (y) ---
        // Buoyancy treated as a spring toward the local surface; damping against vertical velocity.
        let state = &mut ship.state.primary.physical;
        let heave_error = h_center - state.position[1];
        let heave_accel = K_HEAVE * heave_error - C_HEAVE * state.velocity[1];
        state.acceleration[1] = heave_accel;
        state.velocity[1] += heave_accel * DT_S;
        state.position[1] += state.velocity[1] * DT_S;

        // --- Pitch (around x axis) ---
        // Positive pitch = bow up. Longitudinal slope: (h_bow - h_stern) / length.
        let long_slope = (h_bow - h_stern) / (2.0 * half_length);
        let target_pitch = long_slope.atan();
        let pitch_error = target_pitch - state.pitch_rad;
        let pitch_accel = K_PITCH * pitch_error - C_PITCH * state.pitch_rate;
        state.pitch_rate += pitch_accel * DT_S;
        state.pitch_rad += state.pitch_rate * DT_S;
        if state.pitch_rad > MAX_PITCH_RAD {
            state.pitch_rad = MAX_PITCH_RAD;
            state.pitch_rate = state.pitch_rate.min(0.0);
        } else if state.pitch_rad < -MAX_PITCH_RAD {
            state.pitch_rad = -MAX_PITCH_RAD;
            state.pitch_rate = state.pitch_rate.max(0.0);
        }

        // --- Roll (around forward axis) ---
        // Positive roll = starboard down. Transverse slope: (h_stbd - h_port) / beam.
        let trans_slope = (h_stbd - h_port) / (2.0 * half_beam);
        let target_roll = trans_slope.atan();
        let roll_error = target_roll - state.roll_rad;
        let roll_accel = K_ROLL * roll_error - C_ROLL * state.roll_rate;
        state.roll_rate += roll_accel * DT_S;
        state.roll_rad += state.roll_rate * DT_S;
        if state.roll_rad > MAX_ROLL_RAD {
            state.roll_rad = MAX_ROLL_RAD;
            state.roll_rate = state.roll_rate.min(0.0);
        } else if state.roll_rad < -MAX_ROLL_RAD {
            state.roll_rad = -MAX_ROLL_RAD;
            state.roll_rate = state.roll_rate.max(0.0);
        }

        // Suppress unused-field warning if other code doesn't use damping yet.
        let _ = self.damping;
    }
}
