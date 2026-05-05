// Hand-curated chunks distilled from the LandForge degradation doc. The retriever
// scores chunks against the live snapshot + sim output and feeds the top-K to
// the LLM as grounded context. No embeddings — keyword + threshold heuristics
// are deterministic, fast, and good enough for a hackathon demo.

import type { TheaterEnvSnapshot } from "../env";
import type { LandForgeInput, LandForgeOutput } from "../../sim/types";

export type ChunkTopic =
  | "battery-thermal"
  | "battery-cold"
  | "engine-thermal"
  | "dust-ingestion"
  | "sensor-obscuration"
  | "corrosion"
  | "humidity"
  | "uv-photo"
  | "comms-rf"
  | "mobility";

export interface KnowledgeChunk {
  id: string;
  topic: ChunkTopic;
  text: string;
  trigger: (ctx: ChunkContext) => boolean;
}

export interface ChunkContext {
  snapshot: TheaterEnvSnapshot;
  input: LandForgeInput;
  output: LandForgeOutput;
}

const score = (output: LandForgeOutput, id: string): number => {
  const m = output.metrics.find((x) => x.id === id);
  return m ? m.value : 100;
};

export const KNOWLEDGE_BASE: KnowledgeChunk[] = [
  {
    id: "kb-arrhenius-battery",
    topic: "battery-thermal",
    text:
      "Arrhenius scaling on graphite SEI growth (Ea ≈ 36 kJ/mol) means lithium-ion capacity " +
      "fade roughly doubles per 10°C above the 23°C reference. ISO 12405-2 calls EOL at 80% " +
      "of nominal capacity; sustained operation above 35°C ambient compresses lifecycle.",
    trigger: ({ snapshot }) => snapshot.weather.tempC >= 30,
  },
  {
    id: "kb-cold-battery",
    topic: "battery-cold",
    text:
      "Below 0°C lithium-ion internal resistance spikes and charge acceptance collapses. " +
      "Fast-charging cold cells plates metallic lithium on the anode — irreversible and a " +
      "dendrite/short hazard. Diesel fuel paraffin gels below pour point and clogs injectors.",
    trigger: ({ snapshot }) => snapshot.weather.tempC <= 0,
  },
  {
    id: "kb-engine-heat",
    topic: "engine-thermal",
    text:
      "Lubricant oxidation rate doubles per 10°C above the reference per the Arrhenius rate " +
      "rule, halving service life. Hot intake air is less oxygen-dense, so combustion runs " +
      "stoichiometrically lean and total power output drops.",
    trigger: ({ snapshot }) => snapshot.weather.tempC >= 35,
  },
  {
    id: "kb-dust-power-loss",
    topic: "dust-ingestion",
    text:
      "GJB-242A 54-hour dust ingestion at 53 mg/m³ produced an absolute power loss of 11.33% " +
      "and a turbine exhaust temperature rise of +27.9°C, with abrasive wear concentrated on " +
      "first-stage axial blade leading edges and centrifugal impeller inlets.",
    trigger: ({ snapshot }) =>
      (snapshot.cams?.pm10 ?? 0) >= 50 || (snapshot.cams?.aod550 ?? 0) >= 0.4,
  },
  {
    id: "kb-dust-cooling-blockage",
    topic: "dust-ingestion",
    text:
      "Ingested dust adheres in turbine disk cooling holes, blocking internal cavity airflow " +
      "and forcing localized overheating. The compressor common operating line shifts up, " +
      "approaching surge margin.",
    trigger: ({ snapshot }) => (snapshot.cams?.aod550 ?? 0) >= 0.5,
  },
  {
    id: "kb-sensor-mud",
    topic: "sensor-obscuration",
    text:
      "Dry dust on a radome causes ~−3 dB attenuation. With ambient humidity above ~60%, " +
      "the dust converts to adherent mud and attenuation jumps to as much as −20 dB on " +
      "76–81 GHz automotive radar — effective range halves and signal loss persists after drying.",
    trigger: ({ snapshot }) =>
      (snapshot.cams?.pm10 ?? 0) >= 30 && snapshot.weather.relativeHumidity >= 60,
  },
  {
    id: "kb-corrosion-tow",
    topic: "corrosion",
    text:
      "Atmospheric corrosion is gated by Time-of-Wetness: only active when relative humidity " +
      "exceeds ~80% and temperature is above 0°C. Chloride ions from coastal marine aerosols " +
      "drop electrolyte resistance and accelerate galvanic transfer at chassis weld toes.",
    trigger: ({ snapshot }) =>
      snapshot.weather.relativeHumidity >= 80 && snapshot.weather.tempC > 0,
  },
  {
    id: "kb-deliquescence",
    topic: "corrosion",
    text:
      "NaCl deliquesces at 75% RH; MgCl₂ (common de-icer) deliquesces at just 15% RH. Salt " +
      "trapped in chassis crevices keeps corroding even in nominally dry conditions, defeating " +
      "Time-of-Wetness assumptions.",
    trigger: ({ snapshot }) => snapshot.weather.relativeHumidity >= 50,
  },
  {
    id: "kb-condensation",
    topic: "humidity",
    text:
      "When sensor housing temperature drops below the dew point, condensation forms micro-" +
      "droplets that scatter LiDAR returns and degrade camera focus. Magnus formula gives " +
      "saturation vapor pressure with <0.6% uncertainty across −45°C to +60°C.",
    trigger: ({ snapshot }) => snapshot.weather.relativeHumidity >= 75,
  },
  {
    id: "kb-uv-polymer",
    topic: "uv-photo",
    text:
      "UV irradiance (290–400 nm, 300–415 kJ/mol photon energy) drives chain scission in " +
      "structural polymers. GFRP flexural strength drops to 59–64% of original after 2000 hr " +
      "UV exposure; hydraulic hose elastomers embrittle and risk high-pressure rupture.",
    trigger: ({ snapshot }) => snapshot.weather.uvIndex >= 7,
  },
  {
    id: "kb-comms-rf",
    topic: "comms-rf",
    text:
      "GPS-denied + comms-denied operation forces inertial dead-reckoning and pre-planned " +
      "relay waypoints. Heavy precipitation and high RF interference compound the loss; " +
      "mission planners should pre-register fallback routes before entering contested segments.",
    trigger: ({ input }) =>
      input.gpsState !== "normal" || input.commsState !== "normal" || input.rfInterference >= 40,
  },
  {
    id: "kb-mobility-slope",
    topic: "mobility",
    text:
      "Surface friction below 50 with slope above 10° drives traction loss for tracked and " +
      "wheeled UGVs alike. Payload above 30 kg compounds the effect through increased normal " +
      "load on already-compromised contact patches.",
    trigger: ({ input, output }) =>
      input.slope >= 8 || input.surfaceFriction <= 60 || score(output, "mobility") < 60,
  },
];

export function selectChunks(ctx: ChunkContext, max = 5): KnowledgeChunk[] {
  const matched = KNOWLEDGE_BASE.filter((c) => c.trigger(ctx));
  return matched.slice(0, max);
}
