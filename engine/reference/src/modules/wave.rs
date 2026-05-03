use crate::*;
use rand::Rng;
use std::collections::HashMap;
use std::f64::consts::TAU;

const GRAVITY_MPS2: f64 = 9.81;

#[derive(Debug, Clone)]
pub struct Wave {
    pub significant_wave_height_m: f64,
    pub peak_period_s: f64,
    pub jonswap_gamma: f64,
    pub encounter_angle_deg: f64,
    pub slamming_probability: f64,
    pub time_scale: f64,
}

#[derive(Debug, Clone, Copy)]
pub(crate) struct SurfaceTuning {
    mean_stress_norm: f64,
    stress_peak_norm: f64,
    bow_bias: f64,
    stern_bias: f64,
    damage_norm: f64,
    dock_factor: f64,
}

#[derive(Debug, Clone, Copy)]
pub(crate) struct WaveComponent {
    amplitude_m: f64,
    horizontal_m: f64,
    wave_number: f64,
    angular_frequency: f64,
    dir_x: f64,
    dir_z: f64,
    phase: f64,
}

#[derive(Debug, Clone, Copy)]
pub(crate) struct SurfacePoint {
    pub x: f64,
    pub z: f64,
    pub height: f64,
}

impl Default for Wave {
    fn default() -> Self {
        Self {
            significant_wave_height_m: 2.5,
            peak_period_s: 8.0,
            jonswap_gamma: 3.3,
            encounter_angle_deg: 0.0,
            slamming_probability: 0.15,
            time_scale: 0.018,
        }
    }
}

impl Wave {
    pub fn from_parameters(
        significant_wave_height_m: f64,
        peak_period_s: f64,
        jonswap_gamma: f64,
        encounter_angle_deg: f64,
        slamming_probability: f64,
        time_scale: f64,
    ) -> Self {
        Self {
            significant_wave_height_m: significant_wave_height_m.clamp(0.0, 20.0),
            peak_period_s: peak_period_s.clamp(0.5, 20.0),
            jonswap_gamma: jonswap_gamma.clamp(1.0, 8.0),
            encounter_angle_deg: encounter_angle_deg.rem_euclid(360.0),
            slamming_probability: slamming_probability.clamp(0.0, 1.0),
            time_scale: time_scale.clamp(0.001, 0.1),
        }
    }

    pub fn compute_stress(&self, props: &ShipProperties) -> HashMap<HullZone, f64> {
        let pressure = self.compute_pressure() * props.operational.wave_load_factor;
        let moment = self.compute_moment(pressure, props);
        let base_stress = self.compute_base_stress(moment, props);
        self.apply_zone_factors(base_stress)
    }

    pub fn sample_surface_grid(
        &self,
        size_m: f64,
        segments: usize,
        elapsed_s: f64,
        wave_level: f64,
        mean_stress_norm: f64,
        stress_peak_norm: f64,
        bow_bias: f64,
        stern_bias: f64,
        damage_norm: f64,
        dock_factor: f64,
    ) -> Vec<f32> {
        let segments = segments.max(1);
        let tuning = SurfaceTuning {
            mean_stress_norm: mean_stress_norm.clamp(0.0, 1.8),
            stress_peak_norm: stress_peak_norm.clamp(0.0, 1.8),
            bow_bias: bow_bias.clamp(-1.0, 1.0),
            stern_bias: stern_bias.clamp(-1.0, 1.0),
            damage_norm: damage_norm.clamp(0.0, 1.0),
            dock_factor: dock_factor.clamp(0.18, 1.0),
        };
        let half_extent = size_m * 0.5;
        let step = size_m / segments as f64;
        let components =
            self.build_surface_components(wave_level.clamp(0.0, 1.2), tuning, step);
        let mut samples = Vec::with_capacity((segments + 1) * (segments + 1) * 3);

        for row in 0..=segments {
            let z = half_extent - row as f64 * step;

            for column in 0..=segments {
                let x = -half_extent + column as f64 * step;
                let point = self.sample_surface_point(x, z, elapsed_s, &components);
                samples.push(point.x as f32);
                samples.push(point.z as f32);
                samples.push(point.height as f32);
            }
        }

        samples
    }

    fn sample_wave_height(&self) -> f64 {
        let mut rng = rand::thread_rng();
        let sigma = self.significant_wave_height_m * 0.4;
        let u: f64 = rng.gen_range(0.001..0.999);
        (sigma * (-2.0 * u.ln()).sqrt()).abs()
    }

    fn compute_pressure(&self) -> f64 {
        let rho: f64 = 1025.0;
        let angle_rad = self.encounter_angle_deg.to_radians();
        let cw = (angle_rad.cos().abs() * 0.7 + 0.3).clamp(0.3, 1.0);
        rho * GRAVITY_MPS2 * self.sample_wave_height() * cw
    }

    fn compute_moment(&self, pressure: f64, props: &ShipProperties) -> f64 {
        let l = props.hull_geometry.length_m;
        let b = props.hull_geometry.beam_m;
        let cb = props.hull_geometry.block_coefficient;
        pressure * l * l * b * 0.5 * cb
    }

    fn compute_base_stress(&self, moment: f64, props: &ShipProperties) -> f64 {
        let b = props.hull_geometry.beam_m;
        let d = props.hull_geometry.draft_m;
        let t = 0.005;
        let i = (b * d.powi(3) - (b - 2.0 * t) * (d - 2.0 * t).powi(3)) / 12.0;
        let y = d / 2.0;
        ((moment * y / i) / 1_000_000.0) / props.operational.structural_strength_factor.max(0.35)
    }

    fn apply_zone_factors(&self, base_stress: f64) -> HashMap<HullZone, f64> {
        let mut rng = rand::thread_rng();
        let slam = if rng.r#gen::<f64>() < self.slamming_probability {
            1.0 + rng.gen_range(1.5_f64..3.5_f64)
        } else {
            1.0_f64
        };
        [
            HullZone::Keel,
            HullZone::LowerBow,
            HullZone::LowerMidship,
            HullZone::LowerStern,
            HullZone::UpperBow,
            HullZone::UpperMidship,
            HullZone::UpperStern,
            HullZone::Deck,
            HullZone::Transom,
        ]
        .into_iter()
        .map(|zone| {
            let zone_factor = match zone {
                HullZone::Keel => 1.0,
                HullZone::LowerBow => 0.9,
                HullZone::LowerMidship => 0.7,
                HullZone::LowerStern => 0.6,
                HullZone::UpperBow => 0.5,
                HullZone::UpperMidship => 0.7,
                HullZone::UpperStern => 0.4,
                HullZone::Deck => 1.0,
                HullZone::Transom => 0.5,
            };
            let slam_factor = match zone {
                HullZone::Keel | HullZone::LowerBow => slam,
                _ => 1.0,
            };

            (zone, base_stress * zone_factor * slam_factor)
        })
        .collect()
    }

    pub(crate) fn default_components(&self, grid_spacing_m: f64) -> Vec<WaveComponent> {
        let tuning = SurfaceTuning {
            mean_stress_norm: 0.0,
            stress_peak_norm: 0.0,
            bow_bias: 0.0,
            stern_bias: 0.0,
            damage_norm: 0.0,
            dock_factor: 1.0,
        };
        self.build_surface_components(1.2, tuning, grid_spacing_m)
    }

    pub(crate) fn build_surface_components(
        &self,
        wave_level: f64,
        tuning: SurfaceTuning,
        grid_spacing_m: f64,
    ) -> Vec<WaveComponent> {
        let wavelength_scales = [1.0, 0.82, 0.66, 0.52, 0.4];
        let energy_weights = [0.34, 0.27, 0.19, 0.12, 0.08];
        let direction_offsets = [0.0, 0.14, -0.12, 0.24, -0.2];
        let phases = [0.18, 1.12, 2.34, 3.21, 4.19];
        let component_count = wavelength_scales.len() as f64;
        let peak_wavelength_m = (GRAVITY_MPS2 * self.peak_period_s.powi(2)) / TAU;
        let _min_resolved_wavelength_m = grid_spacing_m * 2.0;
        let sea_state_gain = 0.24 + wave_level * 0.72;
        let stress_gain = 0.94
            + tuning.mean_stress_norm * 0.1
            + tuning.stress_peak_norm * 0.08
            + tuning.damage_norm * 0.1;
        let effective_height_m = (self.significant_wave_height_m
            * sea_state_gain
            * stress_gain
            * tuning.dock_factor)
            .clamp(0.08, 20.0);
        let amplitude_scale = effective_height_m * 0.36;
        let direction_spread_rad =
            0.1 + tuning.stress_peak_norm * 0.03 + tuning.damage_norm * 0.02;
        let heading_bias_rad = (tuning.bow_bias - tuning.stern_bias) * 0.12;
        let base_heading_rad = self.encounter_angle_deg.to_radians() + heading_bias_rad;
        let peak_emphasis = ((self.jonswap_gamma - 1.0) / 4.0).clamp(0.0, 1.0);
        let steepness_target =
            (0.1 + wave_level * 0.05 + tuning.stress_peak_norm * 0.03).clamp(0.08, 0.18);

        wavelength_scales
            .iter()
            .zip(energy_weights)
            .zip(direction_offsets)
            .zip(phases)
            .enumerate()
            .map(|(index, (((wavelength_scale, energy_weight), direction_offset), phase))| {
                let center_distance = (index as f64 - 2.0).abs();
                let focus_gain = 1.0
                    + (1.0 - (center_distance / 4.0)).max(0.0) * peak_emphasis * 0.35;
                let wavelength_m = peak_wavelength_m * wavelength_scale;
                let wave_number = TAU / wavelength_m;
                let angular_frequency = (GRAVITY_MPS2 * wave_number).sqrt()
                    * (1.0 + tuning.stress_peak_norm * 0.02 + if index >= 3 { 0.03 } else { 0.0 });
                let amplitude_m = amplitude_scale * energy_weight * focus_gain;
                let direction_rad = base_heading_rad
                    + direction_offset * direction_spread_rad
                    + if index >= 3 {
                        tuning.stern_bias * 0.04
                    } else {
                        tuning.bow_bias * 0.02
                    };
                let dir_x = direction_rad.cos();
                let dir_z = direction_rad.sin();
                let gerstner_q = (steepness_target
                    / (amplitude_m.max(0.01) * wave_number * component_count))
                    .clamp(0.02, 0.16);
                let horizontal_m = amplitude_m * gerstner_q * 0.2;

                WaveComponent {
                    amplitude_m,
                    horizontal_m,
                    wave_number,
                    angular_frequency,
                    dir_x,
                    dir_z,
                    phase,
                }
            })
            .collect()
    }

    pub(crate) fn sample_surface_point(
        &self,
        x: f64,
        z: f64,
        elapsed_s: f64,
        components: &[WaveComponent],
    ) -> SurfacePoint {
        let scaled_elapsed_s = elapsed_s * self.time_scale;
        let mut offset_x = 0.0;
        let mut offset_z = 0.0;
        let mut height = 0.0;

        for component in components {
            let theta = component.wave_number * (component.dir_x * x + component.dir_z * z)
                - component.angular_frequency * scaled_elapsed_s
                + component.phase;
            let sin_theta = theta.sin();
            let cos_theta = theta.cos();

            offset_x += component.dir_x * component.horizontal_m * cos_theta;
            offset_z += component.dir_z * component.horizontal_m * cos_theta;
            height += component.amplitude_m * sin_theta;
        }

        SurfacePoint {
            x: x + offset_x,
            z: z + offset_z,
            height,
        }
    }

    pub fn update_fatigue(&self, ship: &mut Ship) {
        let stress_map = self.compute_stress(&ship.properties);
        let sn = &ship.properties.material_properties.sn_curve;
        let material = &ship.properties.material_properties;
        let wave_height_factor = (0.85 + self.significant_wave_height_m.powf(1.45) * 1.3)
            .clamp(0.9, 14.0);
        let period_factor =
            (0.95 + self.peak_period_s.clamp(0.5, 16.0).powf(0.85) * 0.24).clamp(1.0, 3.8);
        let slam_factor =
            (1.0 + self.slamming_probability.clamp(0.0, 1.0) * 6.5).clamp(1.0, 7.5);
        let spectrum_factor =
            (0.92 + (self.jonswap_gamma - 1.0).max(0.0) * 0.22).clamp(0.92, 2.1);
        let encounter_factor =
            (0.9 + self.encounter_angle_deg.to_radians().cos().abs() * 0.42).clamp(0.9, 1.32);
        let wave_fatigue_multiplier = wave_height_factor
            * period_factor
            * slam_factor
            * spectrum_factor
            * encounter_factor;

        for plate in ship.state.primary.plating_map.iter_mut() {
            if let Some(&stress) = stress_map.get(&plate.zone) {
                let stress_reference_mpa = sn
                    .fatigue_limit_mpa
                    .or_else(|| material.yield_strength_mpa.map(|yield_strength| yield_strength * 0.28))
                    .unwrap_or(material.ultimate_tensile_strength_mpa * 0.2)
                    .max(1.0);
                let stress_ratio = (stress / stress_reference_mpa).max(0.0);

                // Keep every zone starting at 1.0 and decaying over time rather than
                // allowing a single extreme frame to zero out fatigue life instantly.
                if stress_ratio <= 0.58 {
                    continue;
                }

                let severity = ((stress_ratio - 0.58) / 1.05).clamp(0.0, 3.0);
                let thickness_factor = (0.005 / plate.thickness_m.max(0.003)).clamp(0.75, 1.45);
                let zone_factor = match plate.zone {
                    HullZone::Keel => 1.42,
                    HullZone::LowerBow => 1.46,
                    HullZone::UpperBow => 1.18,
                    HullZone::LowerMidship => 1.08,
                    HullZone::UpperMidship => 0.94,
                    HullZone::LowerStern => 1.02,
                    HullZone::UpperStern => 0.9,
                    HullZone::Deck => 1.08,
                    HullZone::Transom => 1.18,
                };
                let curve_factor =
                    (2_000_000.0 / sn.reference_cycles.max(1) as f64).powf(0.2).clamp(0.7, 1.25);
                let damage = (0.00042
                    * severity.powf(1.7)
                    * thickness_factor
                    * zone_factor
                    * curve_factor
                    * wave_fatigue_multiplier
                    * ship.properties.operational.fatigue_damage_multiplier)
                    .clamp(0.0, 0.028);

                plate.fatigue_life = (plate.fatigue_life - damage).max(0.0);
            }
        }
    }
}
