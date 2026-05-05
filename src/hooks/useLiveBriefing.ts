import { useCallback, useState } from "react";
import { runLandForge } from "../sim/runLandForge";
import { getTheaterSnapshot, type TheaterEnvSnapshot } from "../services/env";
import { generateCards } from "../services/rag/generateCards";
import { applySnapshotToFields } from "./useLiveConditions";
import type { AssessmentCard, LandForgeInput } from "../sim/types";

// One-button briefing: pull live env data → apply to sliders → ask the LLM
// to write physics-grounded cards from the resulting state. The two stages run
// sequentially so the LLM sees the just-applied input.

export type BriefingStage = "idle" | "pulling" | "assessing" | "done";

export interface UseLiveBriefingArgs {
  lat: number;
  lng: number;
  theaterId?: string;
  input: LandForgeInput;
  setField: <K extends keyof LandForgeInput>(key: K, value: LandForgeInput[K]) => void;
}

export interface UseLiveBriefingResult {
  stage: BriefingStage;
  error: string | null;
  snapshot: TheaterEnvSnapshot | null;
  enrichedCards: AssessmentCard[] | null;
  run: () => Promise<void>;
  clear: () => void;
}

export function useLiveBriefing({
  lat,
  lng,
  theaterId,
  input,
  setField,
}: UseLiveBriefingArgs): UseLiveBriefingResult {
  const [stage, setStage] = useState<BriefingStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<TheaterEnvSnapshot | null>(null);
  const [enrichedCards, setEnrichedCards] = useState<AssessmentCard[] | null>(null);

  const run = useCallback(async () => {
    setError(null);
    setEnrichedCards(null);
    setStage("pulling");
    try {
      const snap = await getTheaterSnapshot({ lat, lng, theaterId });
      applySnapshotToFields(snap, { setField });
      setSnapshot(snap);

      // Build the input the LLM should see — same fields, just with the new
      // weather values applied. We don't wait for React to re-render.
      const projectedInput: LandForgeInput = {
        ...input,
        airTemp: Math.round(snap.weather.tempC),
        visibility: Math.max(
          0,
          Math.min(100, Math.round((snap.weather.visibilityMeters / 24000) * 100)),
        ),
      };
      const projectedOutput = runLandForge(projectedInput);

      setStage("assessing");
      const cards = await generateCards({
        snapshot: snap,
        input: projectedInput,
        output: projectedOutput,
      });
      setEnrichedCards(cards);
      setStage("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStage("idle");
    }
  }, [lat, lng, theaterId, input, setField]);

  const clear = useCallback(() => {
    setEnrichedCards(null);
    setSnapshot(null);
    setStage("idle");
    setError(null);
  }, []);

  return { stage, error, snapshot, enrichedCards, run, clear };
}
