// Engine contract. The whole simulation seam lives in this file.
// Anything that wants to talk to the sim engine goes through these types.

export type Precipitation = "none" | "rain" | "snow" | "dust";
export type SignalState = "normal" | "degraded" | "denied";
export type VehicleId = "ugv" | "drone";
export type TheaterId = "arctic" | "hormuz" | "taiwan";

export interface LandForgeInput {
  theater: TheaterId;
  vehicle: VehicleId;

  // Terrain
  surfaceFriction: number; // 0..100
  slope: number;           // degrees
  clutter: number;         // 0..100

  // Atmosphere
  visibility: number;      // 0..100
  airTemp: number;         // °C
  precipitation: Precipitation;

  // Electromagnetic
  gpsState: SignalState;
  commsState: SignalState;
  rfInterference: number;  // 0..100

  // Mission
  payloadKg: number;
}

export type Tone = "stable" | "watch" | "critical";
export type Severity = "green" | "yellow" | "red";

export interface Metric {
  id: string;
  label: string;
  value: number;       // 0..100 for scores; raw for time/etc.
  unit?: string;
  tone: Tone;
}

export interface AssessmentCard {
  id: string;
  title: string;
  severity: Severity;
  why: string;
  action: string;
}

export interface LandForgeOutput {
  readinessScore: number;       // 0..100
  metrics: Metric[];
  cards: AssessmentCard[];
}
