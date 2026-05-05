import type { LandForgeInput, LandForgeOutput } from "../../sim/types";
import type { TheaterEnvSnapshot } from "../env";
import type { KnowledgeChunk } from "./knowledgeBase";

export const SYSTEM_PROMPT = `You are LandForge's mission readiness narrator for autonomous ground systems.

You receive:
- a live environmental snapshot (real weather + dust/aerosol data)
- the operator's mission inputs
- the rule-based readiness scores already computed by the sim
- 1-5 physics excerpts from the LandForge knowledge base (degradation equations and field test results)

Your job: produce 1-4 AssessmentCard objects that explain the current readiness picture in concrete, physics-grounded terms. Reference live numbers from the snapshot. Cite the relevant physics from the excerpts when it directly explains a risk. Skip generic platitudes.

Severity rules:
- "red"    → readiness or any subsystem score below 35, or a hard hazard in the excerpts
- "yellow" → score 35-69, or notable stressor present
- "green"  → score 70+ and no notable stressor — only emit one green card if everything is fine

Card field rules:
- id: short kebab-case slug
- title: ≤ 50 chars, no punctuation at end
- why: 1-2 sentences, MUST cite a live number (e.g. "38°C ambient", "PM10 142 µg/m³", "RH 82%") and the relevant physics
- action: 1 sentence, concrete operational step

Return JSON only, matching the supplied schema. No markdown, no prose outside JSON.`;

export interface BuildUserPromptArgs {
  snapshot: TheaterEnvSnapshot;
  input: LandForgeInput;
  output: LandForgeOutput;
  chunks: KnowledgeChunk[];
}

export function buildUserPrompt({ snapshot, input, output, chunks }: BuildUserPromptArgs): string {
  const w = snapshot.weather;
  const c = snapshot.cams;
  const lines: string[] = [];

  lines.push("LIVE SNAPSHOT");
  lines.push(`  location: ${snapshot.lat.toFixed(3)}, ${snapshot.lng.toFixed(3)}`);
  lines.push(`  temp: ${w.tempC.toFixed(1)}°C`);
  lines.push(`  relative humidity: ${w.relativeHumidity}%`);
  lines.push(`  wind: ${w.windKmh.toFixed(1)} km/h`);
  lines.push(`  visibility: ${w.visibilityMeters} m`);
  lines.push(`  UV index: ${w.uvIndex}`);
  lines.push(`  precipitation last hour: ${w.precipMm} mm`);
  if (c) {
    lines.push(`  AOD@550nm: ${c.aod550.toFixed(2)}`);
    lines.push(`  PM2.5: ${c.pm25.toFixed(1)} µg/m³`);
    lines.push(`  PM10: ${c.pm10.toFixed(1)} µg/m³`);
    lines.push(`  dust load bucket: ${c.dustLoad}`);
  } else {
    lines.push("  CAMS dust data: unavailable for this drop point");
  }

  lines.push("");
  lines.push("MISSION INPUTS");
  lines.push(`  theater: ${input.theater} · vehicle: ${input.vehicle}`);
  lines.push(`  surface friction: ${input.surfaceFriction}% · slope: ${input.slope}° · clutter: ${input.clutter}%`);
  lines.push(`  GPS: ${input.gpsState} · comms: ${input.commsState} · RF interference: ${input.rfInterference}%`);
  lines.push(`  payload: ${input.payloadKg} kg`);

  lines.push("");
  lines.push("RULE-BASED SCORES");
  for (const m of output.metrics) {
    lines.push(`  ${m.label}: ${Math.round(m.value)}${m.unit ?? ""} (${m.tone})`);
  }

  lines.push("");
  lines.push("RELEVANT PHYSICS EXCERPTS");
  if (chunks.length === 0) {
    lines.push("  (none triggered — write a single 'green' card)");
  } else {
    for (const chunk of chunks) {
      lines.push(`  [${chunk.topic}] ${chunk.text}`);
    }
  }

  return lines.join("\n");
}

export const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    cards: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          severity: { type: "string", enum: ["green", "yellow", "red"] },
          why: { type: "string" },
          action: { type: "string" },
        },
        required: ["id", "title", "severity", "why", "action"],
        additionalProperties: false,
      },
    },
  },
  required: ["cards"],
  additionalProperties: false,
} as const;
