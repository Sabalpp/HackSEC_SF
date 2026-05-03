import { useMemo, useState } from "react";
import { CONDITION_DEFAULTS } from "../data/conditions";
import { runLandForge } from "../sim/runLandForge";
import type { LandForgeInput, LandForgeOutput, TheaterId, VehicleId } from "../sim/types";

export interface UseLandForgeArgs {
  theater: TheaterId;
  vehicle: VehicleId;
}

export interface UseLandForgeResult {
  input: LandForgeInput;
  output: LandForgeOutput;
  setField: <K extends keyof LandForgeInput>(key: K, value: LandForgeInput[K]) => void;
  reset: () => void;
}

function buildDefaults(theater: TheaterId, vehicle: VehicleId): LandForgeInput {
  return { ...CONDITION_DEFAULTS, theater, vehicle } as LandForgeInput;
}

export function useLandForge({ theater, vehicle }: UseLandForgeArgs): UseLandForgeResult {
  const [input, setInput] = useState<LandForgeInput>(() => buildDefaults(theater, vehicle));

  const synced = useMemo<LandForgeInput>(
    () => ({ ...input, theater, vehicle }),
    [input, theater, vehicle],
  );

  const output = useMemo(() => runLandForge(synced), [synced]);

  const setField = <K extends keyof LandForgeInput>(key: K, value: LandForgeInput[K]) => {
    setInput((prev) => ({ ...prev, [key]: value }));
  };

  const reset = () => setInput(buildDefaults(theater, vehicle));

  return { input: synced, output, setField, reset };
}
