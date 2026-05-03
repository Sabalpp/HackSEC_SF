import type {
  AssessmentCard,
  LandForgeInput,
  LandForgeOutput,
  Metric,
  Tone,
} from "./types";

// SEAM: this is the placeholder engine. The real LandForge engine (rule-based
// readiness scoring, or a Python physics core wired through a server) replaces
// the body of this function. The signature is the contract — keep it stable.
//
// Inputs come in as LandForgeInput, outputs go out as LandForgeOutput.
// The UI re-renders whenever this returns a new object.

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

function toneFor(score: number): Tone {
  if (score >= 70) return "stable";
  if (score >= 45) return "watch";
  return "critical";
}

function signalPenalty(state: "normal" | "degraded" | "denied"): number {
  if (state === "denied") return 60;
  if (state === "degraded") return 25;
  return 0;
}

export function runLandForge(input: LandForgeInput): LandForgeOutput {
  const isDrone = input.vehicle === "drone";

  const mobilityScore = clamp(
    input.surfaceFriction
      - input.slope * 1.2
      - input.clutter * 0.2
      - (isDrone ? 0 : input.payloadKg * 0.4),
  );

  const sensorScore = clamp(
    input.visibility
      - (input.precipitation === "fog" ? 25 : 0)
      - (input.precipitation === "dust" ? 30 : 0)
      - (input.precipitation === "snow" ? 20 : 0)
      - input.clutter * 0.15,
  );

  const commsScore = clamp(
    100 - signalPenalty(input.commsState) - input.rfInterference * 0.6,
  );

  const gpsScore = clamp(100 - signalPenalty(input.gpsState));

  const tempStress = Math.max(0, Math.abs(input.airTemp - 18) - 10);
  const batteryScore = clamp(
    100 - tempStress * 1.4 - input.slope * 0.5 - (isDrone ? input.payloadKg * 1.2 : input.payloadKg * 0.3),
  );

  let readinessScore = clamp(
    0.30 * mobilityScore
      + 0.20 * batteryScore
      + 0.20 * sensorScore
      + 0.20 * commsScore
      + 0.10 * gpsScore,
  );

  if (input.gpsState === "denied" && input.commsState === "denied") {
    readinessScore = Math.min(readinessScore, 55);
  }
  if (mobilityScore < 25) {
    readinessScore = Math.min(readinessScore, 50);
  }

  const metrics: Metric[] = [
    { id: "readiness", label: "Mission readiness", value: readinessScore, tone: toneFor(readinessScore), unit: "%" },
    { id: "mobility", label: "Mobility", value: mobilityScore, tone: toneFor(mobilityScore), unit: "%" },
    { id: "battery", label: "Battery margin", value: batteryScore, tone: toneFor(batteryScore), unit: "%" },
    { id: "sensors", label: "Sensor confidence", value: sensorScore, tone: toneFor(sensorScore), unit: "%" },
    { id: "comms", label: "Comms reliability", value: commsScore, tone: toneFor(commsScore), unit: "%" },
    { id: "gps", label: "GPS reliability", value: gpsScore, tone: toneFor(gpsScore), unit: "%" },
  ];

  const cards: AssessmentCard[] = [];
  if (mobilityScore < 50) {
    cards.push({
      id: "mobility",
      title: "Mobility risk on traversal",
      severity: mobilityScore < 30 ? "red" : "yellow",
      why: `Surface friction ${input.surfaceFriction}% with ${input.slope}° slope${isDrone ? "" : ` and ${input.payloadKg}kg payload`} stresses traction.`,
      action: isDrone ? "Reduce ground-effect operations." : "Reroute around steeper or muddier segments, or shed payload.",
    });
  }
  if (sensorScore < 60) {
    cards.push({
      id: "sensors",
      title: "Sensor confidence degraded",
      severity: sensorScore < 35 ? "red" : "yellow",
      why: `Visibility ${input.visibility}% with ${input.precipitation} precipitation lowers perception quality.`,
      action: "Switch to thermal or reduce speed to allow sensor convergence.",
    });
  }
  if (commsScore < 60 || gpsScore < 60) {
    cards.push({
      id: "ew",
      title: "Electromagnetic risk",
      severity: commsScore < 35 || gpsScore < 35 ? "red" : "yellow",
      why: `GPS ${input.gpsState}, comms ${input.commsState}, RF interference ${input.rfInterference}%.`,
      action: "Plan relay waypoints and inertial fallback for the contested segment.",
    });
  }
  if (cards.length === 0) {
    cards.push({
      id: "ok",
      title: "Mission profile within envelope",
      severity: "green",
      why: "All subsystems are above the watch threshold.",
      action: "Proceed and log baseline metrics.",
    });
  }

  return { readinessScore, metrics, cards };
}
