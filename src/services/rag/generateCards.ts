import type { AssessmentCard, LandForgeInput, LandForgeOutput } from "../../sim/types";
import type { TheaterEnvSnapshot } from "../env";

export interface GenerateArgs {
  snapshot: TheaterEnvSnapshot;
  input: LandForgeInput;
  output: LandForgeOutput;
  signal?: AbortSignal;
}

export async function generateCards({
  snapshot,
  input,
  output,
  signal,
}: GenerateArgs): Promise<AssessmentCard[]> {
  const res = await fetch("/api/assess", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ snapshot, input, output }),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`/api/assess ${res.status}: ${text || res.statusText}`);
  }
  const json = (await res.json()) as { cards: AssessmentCard[] };
  if (!Array.isArray(json.cards)) {
    throw new Error("assess response missing cards array");
  }
  return json.cards;
}
